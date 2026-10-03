import {Button, ScrollView, Shimmer, ShimmerItem, ShimmerItemCornerRadius, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {formatDuration} from '../format';
import {t} from '../i18n/strings';
import type {RedditError} from '../reddit/client';

/** Title and body for a failed request. */
export function errorCopy(error: RedditError | null): [string, string] {
  switch (error?.kind) {
    case 'network':
      return [t('errNetworkTitle'), t('errNetworkBody')];
    case 'ratelimit':
      return [
        t('errRateTitle'),
        error.retryAfter != null ? t('errRateBody', {time: formatDuration(error.retryAfter * 1000)}) : t('errRateBodyNoTime'),
      ];
    case 'notfound':
      return [t('errNotFoundTitle'), t('errNotFoundBody')];
    case 'forbidden':
      return [t('errForbiddenTitle'), t('errForbiddenBody')];
    case 'auth':
      return [t('expiredTitle'), t('expiredBody')];
    case 'renewal':
      return [t('renewalFailedTitle'), t('renewalFailedBody')];
    default:
      return [t('errServerTitle'), t('errServerBody')];
  }
}

type Props = {
  title: string;
  body: string;
  /** Recovery command; without one the text itself takes focus. */
  action?: {label: string; onClick(): void};
  detail?: string;
  role?: 'alert' | 'status';
  ariaLabel: string;
};

/** Empty and error states: copy in the route's single ScrollView, with its recovery Button below. */
export function StateContent({title, body, action, detail, role, ariaLabel}: Props) {
  return (
    <ScrollView insetForHeader tabIndex={action ? undefined : 0} ariaLabel={ariaLabel}>
      <div className="content-inset" role={role}>
        <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
          {title}
        </TextView>
        <TextView as="p" textStyle={TextStyle.LABEL} textColor={TextColor.SECONDARY}>
          {body}
        </TextView>
        {detail ? (
          <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
            {detail}
          </TextView>
        ) : null}
        {action ? (
          <div className="state-action">
            <Button title={action.label} alwaysShowText onClick={action.onClick} />
          </div>
        ) : null}
      </div>
    </ScrollView>
  );
}

/** The error state of a collection, with Try again. */
export function ErrorContent({error, onRetry}: {error: RedditError | null; onRetry(): void}) {
  const [title, body] = errorCopy(error);
  return (
    <StateContent
      title={title}
      body={body}
      detail={error?.status != null && error.kind !== 'ratelimit' ? t('httpStatus', {status: error.status}) : undefined}
      action={{label: t('retry'), onClick: onRetry}}
      role="alert"
      ariaLabel={t('errorLabel')}
    />
  );
}

/** While a collection loads: placeholders shaped like its rows. Focus stays where it was. */
export function LoadingContent({rows = 3}: {rows?: number}) {
  return (
    <ScrollView insetForHeader ariaLabel={t('loadingLabel')}>
      <div className="content-inset" role="status" aria-label={t('loadingLabel')}>
        <Shimmer>
          <div className="shimmer-rows">
            {Array.from({length: rows}, (_, index) => (
              <div key={index} className="shimmer-row">
                <ShimmerItem className="shimmer-avatar" cornerRadius={ShimmerItemCornerRadius.XLARGE} />
                <div className="shimmer-lines">
                  <ShimmerItem className="shimmer-line shimmer-line--short" />
                  <ShimmerItem className="shimmer-line" />
                </div>
              </div>
            ))}
          </div>
        </Shimmer>
      </div>
    </ScrollView>
  );
}
