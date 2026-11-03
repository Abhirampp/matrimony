using System.Text.Json;
using Matrimony.Api.Data;
using Matrimony.Api.Dtos;
using Matrimony.Api.Models;
using Matrimony.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Matrimony.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/saved-searches")]
public class SavedSearchesController(AppDbContext db) : ControllerBase
{
    public const int MaxSaved = 10;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<List<SavedSearchDto>> List()
    {
        var me = User.UserId();
        var rows = await db.SavedSearches.AsNoTracking().Where(s => s.UserId == me).OrderByDescending(s => s.CreatedAt).ToListAsync();
        return rows.Select(ToDto).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<SavedSearchDto>> Save(SavedSearchRequest req)
    {
        var me = User.UserId();
        if (await db.SavedSearches.CountAsync(s => s.UserId == me) >= MaxSaved)
            return BadRequest(new { message = $"You can keep up to {MaxSaved} saved searches. Delete one first." });

        // Paging isn't part of a saved search
        req.Query.Page = 1;
        var row = new SavedSearch { UserId = me, Name = req.Name.Trim(), QueryJson = JsonSerializer.Serialize(req.Query, Json) };
        db.SavedSearches.Add(row);
        await db.SaveChangesAsync();
        return ToDto(row);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var me = User.UserId();
        await db.SavedSearches.Where(s => s.Id == id && s.UserId == me).ExecuteDeleteAsync();
        return NoContent();
    }

    private static SavedSearchDto ToDto(SavedSearch s) =>
        new(s.Id, s.Name, JsonSerializer.Deserialize<SearchQuery>(s.QueryJson, Json) ?? new SearchQuery(), s.CreatedAt);
}
