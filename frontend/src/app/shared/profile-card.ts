import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ProfileCard } from '../core/models';
import { heightLabel, initials } from './options';

@Component({
  selector: 'app-profile-card',
  imports: [RouterLink],
  template: `
    @let p = profile();
    <a class="pcard" [routerLink]="['/profile', p.userId]">
      <div class="pcard-photo">
        @if (photo()) {
          <img [src]="photo()" [alt]="p.fullName" loading="lazy" />
        } @else if (p.photoLocked) {
          <span class="photo-locked"><span class="lock">🔒</span>Photo protected</span>
        } @else {
          <span class="avatar-initials">{{ initialsOf(p.fullName) }}</span>
        }
        @if (p.isVerified) { <span class="badge-verified" title="Verified profile">✔ Verified</span> }
        @if (p.matchScore != null) { <span class="badge-match" title="How well you fit each other's preferences">{{ p.matchScore }}% match</span> }
      </div>
      <div class="pcard-body">
        <h3>{{ p.fullName }} @if (p.isPremium) { <span class="badge-premium" title="Premium member">★ Premium</span> }</h3>
        <p class="muted">{{ p.age }} yrs{{ p.heightCm ? ', ' + height(p.heightCm) : '' }} · {{ p.maritalStatus }}</p>
        <p>{{ p.religion }}{{ p.caste ? ' · ' + p.caste : '' }}{{ p.motherTongue ? ' · ' + p.motherTongue : '' }}</p>
        <p>{{ p.education }}{{ p.occupation ? ' · ' + p.occupation : '' }}</p>
        <p class="muted">📍 {{ p.city }}{{ p.state ? ', ' + p.state : '' }}</p>
      </div>
    </a>
  `,
})
export class ProfileCardComponent {
  private api = inject(ApiService);
  profile = input.required<ProfileCard>();
  photo = computed(() => this.api.photo(this.profile().photoUrl));
  height = heightLabel;
  initialsOf = initials;
}
