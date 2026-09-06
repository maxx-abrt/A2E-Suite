import { Field, ObjectType } from '@nestjs/graphql';

import { AppSearchRecordDTO } from 'src/engine/core-modules/search/dtos/app-search-record.dto';

@ObjectType('AppSearchResultGroup')
export class AppSearchResultGroupDTO {
  // Universal identifier of the app that produced this group; the front uses
  // it as the frecency group key and resolves the display name from its own
  // application metadata.
  @Field(() => String)
  appUniversalIdentifier: string;

  @Field(() => [AppSearchRecordDTO])
  records: AppSearchRecordDTO[];
}
