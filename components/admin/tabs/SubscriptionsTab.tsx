import { BusinessSubscription } from '../../../lib/api';
import { formatDate, formatMinor } from '../format';

type SubscriptionsTabProps = {
  isOwner: boolean;
  loadingTabData: boolean;
  pendingAction: string;
  businessSubscriptions: BusinessSubscription[];
  subStatus: string;
  subPlan: string;
  subUser: string;
  subCountry: string;
  subPriceDrafts: Record<string, string>;
  onSubStatusChange: (value: string) => void;
  onSubPlanChange: (value: string) => void;
  onSubUserChange: (value: string) => void;
  onSubCountryChange: (value: string) => void;
  onSubPriceDraftChange: (subscriptionID: string, value: string) => void;
  onSubscriptionAction: (
    action: 'plan' | 'cancel' | 'resume' | 'pause' | 'sync',
    item: BusinessSubscription,
  ) => void;
};

export default function SubscriptionsTab({
  isOwner,
  loadingTabData,
  pendingAction,
  businessSubscriptions,
  subStatus,
  subPlan,
  subUser,
  subCountry,
  subPriceDrafts,
  onSubStatusChange,
  onSubPlanChange,
  onSubUserChange,
  onSubCountryChange,
  onSubPriceDraftChange,
  onSubscriptionAction,
}: SubscriptionsTabProps) {
  const safeSubs = businessSubscriptions ?? [];

  return (
    <section className="panel">
      <h2>Subscriptions</h2>
      <div className="filter-row">
        <label className="inline-field">
          <span>Status</span>
          <input
            value={subStatus}
            onChange={(event) => onSubStatusChange(event.target.value)}
            placeholder="active, canceled…"
          />
        </label>
        <label className="inline-field">
          <span>Plan price id</span>
          <input
            value={subPlan}
            onChange={(event) => onSubPlanChange(event.target.value)}
            placeholder="price_..."
          />
        </label>
        <label className="inline-field">
          <span>User ID</span>
          <input
            value={subUser}
            onChange={(event) => onSubUserChange(event.target.value)}
            placeholder="user id"
          />
        </label>
        <label className="inline-field">
          <span>Country</span>
          <input
            value={subCountry}
            onChange={(event) => onSubCountryChange(event.target.value)}
            placeholder="NL / BG"
          />
        </label>
      </div>

      {loadingTabData ? (
        <p className="subtle">Loading subscriptions…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subscription</th>
                <th>User</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Period</th>
                <th>Invoice</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeSubs.map((entry) => (
                <tr key={entry.subscription_id}>
                  <td>{entry.subscription_id ?? '—'}</td>
                  <td>
                    {entry.user_email || entry.user_id || '—'}
                    <div className="muted-text">{entry.user_tier ?? '—'}</div>
                  </td>
                  <td>
                    {entry.status ?? '—'}
                    {entry.paused && <div className="muted-text">paused collection</div>}
                  </td>
                  <td>
                    <input
                      value={subPriceDrafts[entry.subscription_id] ?? entry.plan_price_id ?? ''}
                      onChange={(event) =>
                        onSubPriceDraftChange(entry.subscription_id, event.target.value)
                      }
                      disabled={!isOwner}
                    />
                    <div className="muted-text">{entry.plan_interval || 'n/a'}</div>
                  </td>
                  <td>
                    {formatDate(entry.current_period_start)}
                    <div className="muted-text">to {formatDate(entry.current_period_end)}</div>
                  </td>
                  <td>
                    {entry.invoice_status || '—'}
                    <div className="muted-text">
                      due {formatMinor(entry.amount_due ?? 0, entry.currency ?? 'EUR')} / paid{' '}
                      {formatMinor(entry.amount_paid ?? 0, entry.currency ?? 'EUR')}
                    </div>
                  </td>
                  <td className="actions">
                    <button
                      className="btn muted"
                      type="button"
                      disabled={!isOwner || pendingAction === `plan:${entry.subscription_id}`}
                      onClick={() => onSubscriptionAction('plan', entry)}
                    >
                      Plan switch
                    </button>
                    <button
                      className="btn muted"
                      type="button"
                      disabled={!isOwner || pendingAction === `cancel:${entry.subscription_id}`}
                      onClick={() => onSubscriptionAction('cancel', entry)}
                    >
                      Cancel end
                    </button>
                    <button
                      className="btn muted"
                      type="button"
                      disabled={!isOwner || pendingAction === `resume:${entry.subscription_id}`}
                      onClick={() => onSubscriptionAction('resume', entry)}
                    >
                      Resume
                    </button>
                    <button
                      className="btn muted"
                      type="button"
                      disabled={!isOwner || pendingAction === `pause:${entry.subscription_id}`}
                      onClick={() => onSubscriptionAction('pause', entry)}
                    >
                      Pause
                    </button>
                    <button
                      className="btn muted"
                      type="button"
                      disabled={!isOwner || pendingAction === `sync:${entry.subscription_id}`}
                      onClick={() => onSubscriptionAction('sync', entry)}
                    >
                      Sync
                    </button>
                  </td>
                </tr>
              ))}
              {safeSubs.length === 0 && (
                <tr>
                  <td colSpan={7}>No subscriptions matched the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
