import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from '../core/api.service';
import { ProfileCard, SavedSearch, SearchQuery } from '../core/models';
import { ProfileCardComponent } from '../shared/profile-card';
import { DIETS, EDUCATION, HEIGHTS, MARITAL_STATUSES, MOTHER_TONGUES, RELIGIONS } from '../shared/options';

@Component({
  selector: 'app-search',
  imports: [FormsModule, ProfileCardComponent],
  template: `
    <div class="container page search-layout">
      <form class="card filters" (ngSubmit)="search(1)">
        <h3>Filters</h3>
        <div class="grid-2">
          <label>Age from <input type="number" min="18" max="80" [(ngModel)]="q.ageMin" name="ageMin" /></label>
          <label>to <input type="number" min="18" max="80" [(ngModel)]="q.ageMax" name="ageMax" /></label>
        </div>
        <label>Min height
          <select [(ngModel)]="q.heightMin" name="heightMin">
            <option [ngValue]="null">Any</option>
            @for (h of heights; track h.cm) { <option [ngValue]="h.cm">{{ h.label }}</option> }
          </select>
        </label>
        <label>Religion
          <select [(ngModel)]="q.religion" name="religion">
            <option value="">Any</option>
            @for (r of religions; track r) { <option>{{ r }}</option> }
          </select>
        </label>
        <label>Caste <input [(ngModel)]="q.caste" name="caste" placeholder="Any" /></label>
        <label>Mother tongue
          <select [(ngModel)]="q.motherTongue" name="motherTongue">
            <option value="">Any</option>
            @for (t of tongues; track t) { <option>{{ t }}</option> }
          </select>
        </label>
        <label>Marital status
          <select [(ngModel)]="q.maritalStatus" name="maritalStatus">
            <option value="">Any</option>
            @for (m of marital; track m) { <option>{{ m }}</option> }
          </select>
        </label>
        <label>Education
          <select [(ngModel)]="q.education" name="education">
            <option value="">Any</option>
            @for (e of education; track e) { <option>{{ e }}</option> }
          </select>
        </label>
        <label>Diet
          <select [(ngModel)]="q.diet" name="diet">
            <option value="">Any</option>
            @for (d of diets; track d) { <option>{{ d }}</option> }
          </select>
        </label>
        <label>City <input [(ngModel)]="q.city" name="city" placeholder="Any" /></label>
        <label>Keyword <input [(ngModel)]="q.keyword" name="keyword" placeholder="Name, job…" /></label>
        <label class="check"><input type="checkbox" [(ngModel)]="q.photoOnly" name="photoOnly" /> With photo only</label>
        <label class="check"><input type="checkbox" [(ngModel)]="q.verifiedOnly" name="verifiedOnly" /> Verified profiles only</label>
        <div class="row gap">
          <button class="btn btn-primary">Search</button>
          <button type="button" class="btn btn-ghost" (click)="reset()">Reset</button>
        </div>
      </form>

      <section>
        @if (saved().length) {
          <div class="saved-row">
            <span class="muted small">Saved searches:</span>
            @for (s of saved(); track s.id) {
              <span class="chip">
                <button class="chip-main" (click)="apply(s)">{{ s.name }}</button>
                <button class="chip-x" (click)="removeSaved(s)" [attr.aria-label]="'Delete ' + s.name">×</button>
              </span>
            }
          </div>
        }
        <div class="section-head">
          <h2>{{ total() }} profile{{ total() === 1 ? '' : 's' }} found</h2>
          @if (saving()) {
            <form class="row gap" (ngSubmit)="saveSearch()">
              <input [(ngModel)]="saveName" name="saveName" placeholder="Name this search" maxlength="60" required autofocus />
              <button class="btn btn-primary btn-sm" [disabled]="!saveName.trim()">Save</button>
              <button type="button" class="btn btn-ghost btn-sm" (click)="saving.set(false)">Cancel</button>
            </form>
          } @else {
            <button class="btn btn-outline btn-sm" (click)="saving.set(true)">☆ Save this search</button>
          }
        </div>
        @if (saveMsg()) { <div class="alert" [class.alert-error]="saveErr()" [class.alert-success]="!saveErr()">{{ saveMsg() }}</div> }
        @if (loading()) {
          <p class="muted">Searching…</p>
        } @else if (results().length === 0) {
          <div class="empty">No profiles match these filters.</div>
        } @else {
          <div class="cards">
            @for (p of results(); track p.userId) { <app-profile-card [profile]="p" /> }
          </div>
          @if (pages() > 1) {
            <div class="pager">
              <button class="btn btn-ghost btn-sm" [disabled]="page() === 1" (click)="search(page() - 1)">‹ Prev</button>
              <span>Page {{ page() }} of {{ pages() }}</span>
              <button class="btn btn-ghost btn-sm" [disabled]="page() === pages()" (click)="search(page() + 1)">Next ›</button>
            </div>
          }
        }
      </section>
    </div>
  `,
})
export class SearchPage {
  private api = inject(ApiService);
  religions = RELIGIONS;
  tongues = MOTHER_TONGUES;
  marital = MARITAL_STATUSES;
  education = EDUCATION;
  heights = HEIGHTS;
  diets = DIETS;

  q: SearchQuery = this.blank();
  results = signal<ProfileCard[]>([]);
  total = signal(0);
  page = signal(1);
  pages = signal(1);
  loading = signal(true);

  saved = signal<SavedSearch[]>([]);
  saving = signal(false);
  saveMsg = signal('');
  saveErr = signal(false);
  saveName = '';

  constructor() {
    this.search(1);
    this.api.savedSearches().subscribe((s) => this.saved.set(s));
  }

  saveSearch() {
    const name = this.saveName.trim();
    if (!name) return;
    this.api.saveSearch(name, { ...this.q }).subscribe({
      next: (s) => {
        this.saved.update((l) => [s, ...l]);
        this.saving.set(false);
        this.saveName = '';
        this.flashSave(`Saved "${s.name}".`, false);
      },
      error: (e) => this.flashSave(errorMessage(e), true),
    });
  }

  apply(s: SavedSearch) {
    // Start from blank filters so nothing from the previous search leaks in
    this.q = { ...this.blank(), ...this.clean(s.query) };
    this.search(1);
  }

  removeSaved(s: SavedSearch) {
    this.api.deleteSavedSearch(s.id).subscribe(() => this.saved.update((l) => l.filter((x) => x.id !== s.id)));
  }

  private clean(q: SearchQuery): SearchQuery {
    const out: any = {};
    for (const [k, v] of Object.entries(q)) if (v !== null && v !== undefined && k !== 'page' && k !== 'pageSize') out[k] = v;
    return out;
  }

  private flashSave(msg: string, error: boolean) {
    this.saveMsg.set(msg);
    this.saveErr.set(error);
    setTimeout(() => this.saveMsg.set(''), 4000);
  }

  search(page: number) {
    this.loading.set(true);
    this.api.search({ ...this.q, page, pageSize: 12 }).subscribe({
      next: (r) => {
        this.results.set(r.items);
        this.total.set(r.total);
        this.page.set(r.page);
        this.pages.set(Math.max(1, Math.ceil(r.total / r.pageSize)));
        this.loading.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => this.loading.set(false),
    });
  }

  reset() {
    this.q = this.blank();
    this.search(1);
  }

  private blank(): SearchQuery {
    return {
      ageMin: null, ageMax: null, heightMin: null, religion: '', caste: '', motherTongue: '', maritalStatus: '',
      education: '', diet: '', city: '', keyword: '', photoOnly: false, verifiedOnly: false,
    };
  }
}
