import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OverviewSection, UsersSection } from './CMSExtendedSections';

describe('CMSExtendedSections', () => {
  it('renders overview quick actions and stats', () => {
    const html = renderToStaticMarkup(
      <OverviewSection
        contentHealth={null}
        readinessSnapshot={null}
        stats={[{ label: 'Articles', value: 3, color: 'from-[#00b3e8] to-[#00c0e8]', icon: () => null }]}
        handleSectionChange={() => {}}
      >
        <div>child</div>
      </OverviewSection>,
    );

    expect(html).toContain('Nouveau Projet');
    expect(html).toContain('Articles');
    expect(html).toContain('child');
  });

  it('shows role-aware warning for non-admin user management', () => {
    const html = renderToStaticMarkup(
      <UsersSection
        user={{ id: 'u1', role: 'author', name: 'Author', email: 'author@example.com' }}
        adminUsersNotice=""
        adminUsersError=""
        adminUsersLoading={false}
        userSearch=""
        setUserSearch={() => {}}
        roleFilter="all"
        setRoleFilter={() => {}}
        statusFilter="all"
        setStatusFilter={() => {}}
        verificationFilter="all"
        setVerificationFilter={() => {}}
        providerFilter="all"
        setProviderFilter={() => {}}
        roleOptions={['admin', 'editor', 'author', 'viewer', 'client']}
        accountStatusOptions={['active', 'invited', 'suspended']}
        providerOptions={['local', 'google', 'facebook']}
        adminUsers={[]}
        filteredAdminUsers={[]}
        selectedUserId={null}
        setSelectedUserId={() => {}}
        selectedAdminUser={null}
        updatingUserId={null}
        patchAdminUser={async () => {}}
        formatUserDate={() => 'n/a'}
        getUserRoleTone={() => 'tone'}
        getUserStatusTone={() => 'tone'}
        refresh={() => {}}
        auditLoading={false}
        auditEvents={[]}
      />, 
    );

    expect(html).toContain('réservées aux administrateurs');
    expect(html).toContain('Aucun utilisateur trouvé');
  });
});
