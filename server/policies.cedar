// DepositGuard access rules, evaluated with Cedar (AWS open source).
//
// Principals
//   User::"<id>"        a signed-in tenant
//   ShareLink::"<token>" the owner/landlord opening a shared report link
// Resources carry a `tenant` (User) and a `property` (Property) attribute.
// Actions
//   view     read a home, its rooms, photos and reports
//   edit     change anything: rooms, photos, comparisons, share links
//   respond  agree or dispute a finding in a report

// Tenants have full control over their own homes.
permit (
  principal is User,
  action in [Action::"view", Action::"edit"],
  resource
)
when { resource has tenant && resource.tenant == principal };

// An owner with a valid share link can read the shared home and respond to
// findings, until the link expires or is revoked.
permit (
  principal is ShareLink,
  action in [Action::"view", Action::"respond"],
  resource
)
when {
  resource has property &&
  principal.property == resource.property &&
  !principal.revoked &&
  context.now < principal.expiresAt
};

// Share links can never change evidence.
forbid (
  principal is ShareLink,
  action == Action::"edit",
  resource
);

// Only the owner side responds to findings; tenants can't answer for them.
forbid (
  principal is User,
  action == Action::"respond",
  resource
);
