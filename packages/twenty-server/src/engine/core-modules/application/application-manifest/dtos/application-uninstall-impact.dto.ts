import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ApplicationUninstallOwnedObjectDTO {
  @Field(() => String)
  universalIdentifier: string;

  @Field(() => String)
  nameSingular: string;
}

@ObjectType()
export class ApplicationUninstallOwnedFieldDTO {
  @Field(() => String)
  universalIdentifier: string;

  @Field(() => String)
  objectNameSingular: string;

  @Field(() => String)
  fieldName: string;
}

@ObjectType()
export class ApplicationUninstallOwnedViewDTO {
  @Field(() => String)
  universalIdentifier: string;

  @Field(() => String)
  objectNameSingular: string;

  @Field(() => String)
  viewName: string;
}

@ObjectType()
export class ApplicationUninstallRecordLossDTO {
  @Field(() => String)
  objectNameSingular: string;

  @Field(() => Int)
  recordCount: number;
}

@ObjectType()
export class ApplicationUninstallCrossAppDependentDTO {
  @Field(() => String)
  dependentApplicationName: string;

  @Field(() => String)
  dependency: string;
}

// Report-only surface for the C3 uninstall confirmation: names what is
// removed before the removal is attempted. Activation truth stays in the
// application table — this must never become a parallel state.
@ObjectType()
export class ApplicationUninstallImpactDTO {
  @Field(() => [ApplicationUninstallOwnedObjectDTO])
  ownedObjects: ApplicationUninstallOwnedObjectDTO[];

  @Field(() => [ApplicationUninstallOwnedFieldDTO])
  ownedFieldsOnStandardObjects: ApplicationUninstallOwnedFieldDTO[];

  @Field(() => [ApplicationUninstallOwnedViewDTO])
  ownedViewsOnStandardObjects: ApplicationUninstallOwnedViewDTO[];

  @Field(() => [ApplicationUninstallRecordLossDTO])
  recordLossByObject: ApplicationUninstallRecordLossDTO[];

  @Field(() => [ApplicationUninstallCrossAppDependentDTO])
  crossAppDependents: ApplicationUninstallCrossAppDependentDTO[];
}
