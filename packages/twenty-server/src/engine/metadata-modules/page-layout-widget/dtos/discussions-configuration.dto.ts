import { Field, ObjectType } from '@nestjs/graphql';

import { IsIn, IsNotEmpty } from 'class-validator';
import { type DiscussionsConfiguration } from 'twenty-shared/types';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

@ObjectType('DiscussionsConfiguration')
export class DiscussionsConfigurationDTO implements DiscussionsConfiguration {
  @Field(() => WidgetConfigurationType)
  @IsIn([WidgetConfigurationType.DISCUSSIONS])
  @IsNotEmpty()
  configurationType: WidgetConfigurationType.DISCUSSIONS;
}
