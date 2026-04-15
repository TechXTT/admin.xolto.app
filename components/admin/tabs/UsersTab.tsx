import { AdminUser } from '../../../lib/api';
import { normalizeAdminRole } from '../format';

type UsersTabProps = {
  users: AdminUser[];
  isOwner: boolean;
  tierDrafts: Record<string, string>;
  roleDrafts: Record<string, string>;
  pendingAction: string;
  onTierDraftChange: (userID: string, value: string) => void;
  onRoleDraftChange: (userID: string, value: string) => void;
  onApplyTier: (user: AdminUser) => void;
  onApplyRole: (user: AdminUser) => void;
  onToggleAdmin: (user: AdminUser) => void;
};

function UsersTable({
  title,
  users,
  isOwner,
  tierDrafts,
  roleDrafts,
  pendingAction,
  onTierDraftChange,
  onRoleDraftChange,
  onApplyTier,
  onApplyRole,
  onToggleAdmin,
  productFirstRoleOption,
}: {
  title: string;
  users: AdminUser[];
  isOwner: boolean;
  tierDrafts: Record<string, string>;
  roleDrafts: Record<string, string>;
  pendingAction: string;
  onTierDraftChange: (userID: string, value: string) => void;
  onRoleDraftChange: (userID: string, value: string) => void;
  onApplyTier: (user: AdminUser) => void;
  onApplyRole: (user: AdminUser) => void;
  onToggleAdmin: (user: AdminUser) => void;
  productFirstRoleOption: boolean;
}) {
  return (
    <>
      <h3 style={{ marginTop: 20 }}>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Tier</th>
              <th>Role</th>
              <th>Admin</th>
              <th>Missions</th>
              <th>Searches</th>
              <th>AI Calls</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.email}</td>
                <td>
                  <select
                    value={tierDrafts[entry.id] ?? entry.tier}
                    onChange={(event) => onTierDraftChange(entry.id, event.target.value)}
                  >
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="power">power</option>
                  </select>
                </td>
                <td>
                  <select
                    value={roleDrafts[entry.id] ?? normalizeAdminRole(entry.role, entry.is_admin)}
                    onChange={(event) => onRoleDraftChange(entry.id, event.target.value)}
                    disabled={!isOwner}
                  >
                    {productFirstRoleOption ? (
                      <>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="operator">operator</option>
                        <option value="owner">owner</option>
                      </>
                    ) : (
                      <>
                        <option value="admin">admin</option>
                        <option value="operator">operator</option>
                        <option value="owner">owner</option>
                        <option value="user">user</option>
                      </>
                    )}
                  </select>
                </td>
                <td>{entry.is_admin ? 'yes' : 'no'}</td>
                <td>{entry.mission_count}</td>
                <td>{entry.search_count}</td>
                <td>{entry.ai_call_count}</td>
                <td className="actions">
                  <button
                    className="btn"
                    type="button"
                    disabled={pendingAction === `tier:${entry.id}`}
                    onClick={() => onApplyTier(entry)}
                  >
                    Apply tier
                  </button>
                  <button
                    className="btn muted"
                    type="button"
                    disabled={!isOwner || pendingAction === `role:${entry.id}`}
                    onClick={() => onApplyRole(entry)}
                  >
                    Apply role
                  </button>
                  <button
                    className="btn muted"
                    type="button"
                    disabled={pendingAction === `admin:${entry.id}`}
                    onClick={() => onToggleAdmin(entry)}
                  >
                    {entry.is_admin ? 'Revoke admin' : 'Grant admin'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={8}>
                  {productFirstRoleOption ? 'No product users found.' : 'No team users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function UsersTab({
  users,
  isOwner,
  tierDrafts,
  roleDrafts,
  pendingAction,
  onTierDraftChange,
  onRoleDraftChange,
  onApplyTier,
  onApplyRole,
  onToggleAdmin,
}: UsersTabProps) {
  const teamUsers = users.filter(
    (entry) => normalizeAdminRole(entry.role, entry.is_admin) !== 'user',
  );
  const productUsers = users.filter(
    (entry) => normalizeAdminRole(entry.role, entry.is_admin) === 'user',
  );

  return (
    <section className="panel">
      <h2>Users</h2>
      <p className="subtle">
        Team users (owner/operator/admin) are separated from product users (user).
      </p>
      <UsersTable
        title={`Team users (${teamUsers.length})`}
        users={teamUsers}
        isOwner={isOwner}
        tierDrafts={tierDrafts}
        roleDrafts={roleDrafts}
        pendingAction={pendingAction}
        onTierDraftChange={onTierDraftChange}
        onRoleDraftChange={onRoleDraftChange}
        onApplyTier={onApplyTier}
        onApplyRole={onApplyRole}
        onToggleAdmin={onToggleAdmin}
        productFirstRoleOption={false}
      />
      <UsersTable
        title={`Product users (${productUsers.length})`}
        users={productUsers}
        isOwner={isOwner}
        tierDrafts={tierDrafts}
        roleDrafts={roleDrafts}
        pendingAction={pendingAction}
        onTierDraftChange={onTierDraftChange}
        onRoleDraftChange={onRoleDraftChange}
        onApplyTier={onApplyTier}
        onApplyRole={onApplyRole}
        onToggleAdmin={onToggleAdmin}
        productFirstRoleOption
      />
    </section>
  );
}
