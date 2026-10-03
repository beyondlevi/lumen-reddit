import circleUserFilled from '@wearables-ui-toolkit/icons/svg/circleuser__filled.svg';
import {IconImage} from '@wearables-ui-toolkit/mrbd';
import type {ReactNode} from 'react';
import {initials} from '../format';

/** Avatar content when there is no picture: initials, or a person icon for a deleted account. */
export function avatarFallback(name: string | null | undefined): ReactNode {
  return name && name !== '[deleted]' ? initials(name) : <IconImage source={circleUserFilled} />;
}
