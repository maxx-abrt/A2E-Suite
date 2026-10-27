import { type I18n } from '@lingui/core';
import { MainText } from 'src/components/MainText';
import { SubTitle } from 'src/components/SubTitle';

type WhatIsTwentyProps = {
  i18n: I18n;
};

export const WhatIsTwenty = ({ i18n }: WhatIsTwentyProps) => {
  return (
    <>
      <SubTitle value={i18n._('What is A2E Suite?')} />
      <MainText>
        {i18n._(
          'A connected workspace for knowledge, projects, calendars and finances. Choose the applications that fit your work.',
        )}
      </MainText>
    </>
  );
};
