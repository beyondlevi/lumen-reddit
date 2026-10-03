import {Page, ScrollView} from '@wearables-ui-toolkit/mrbd';
import {useState} from 'react';
import {LoadingContent, StateContent} from '../components/StateContent';
import {t} from '../i18n/strings';
import {useReddit, type Phase} from '../RedditProvider';

/** Shown instead of every route until a working session is there. */
export function SessionPage({phase}: {phase: Exclude<Phase, {kind: 'ready'}>}) {
  const {reloadConfig} = useReddit();
  const [checked, setChecked] = useState(false);

  if (phase.kind === 'loading') {
    return (
      <Page headerText={t('loadingHeader')} headerIsLoading enableSystemBarInset={false}>
        <LoadingContent />
      </Page>
    );
  }

  const checkAgain = async () => {
    await reloadConfig();
    setChecked(true);
  };
  const [title, body] =
    phase.kind === 'expired'
      ? [t('expiredTitle'), t('expiredBody')]
      : phase.kind === 'invalid'
        ? [t('setupInvalidTitle'), t('setupInvalidBody')]
        : [t('setupTitle'), t('setupBody')];

  return (
    <Page
      headerText={t('setupHeader')}
      headerMetadata={checked && phase.kind === 'setup' ? t('setupStillMissing') : undefined}
      enableSystemBarInset={false}>
      <StateContent
        title={title}
        body={body}
        action={{label: t('checkAgain'), onClick: () => void checkAgain()}}
        role={phase.kind === 'setup' ? 'status' : 'alert'}
        ariaLabel={t('setupLabel')}
      />
    </Page>
  );
}
