import { computeMorphOrRelationFieldJoinColumnName } from '../../twenty-server/src/engine/metadata-modules/field-metadata/utils/compute-morph-or-relation-field-join-column-name.util.ts';
import { computeTableName } from '../../twenty-server/src/engine/utils/compute-table-name.util.ts';

export const buildStarterContentQuery = (schema) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema ?? ''))
    throw new Error(
      'A valid schema identifier is required for starter content',
    );

  // Bundled apps own custom tables; Projects extends Twenty's standard task table.
  const applicationTable = (name) =>
    `"${schema}"."${computeTableName(name, true)}"`;
  const taskTable = `"${schema}"."${computeTableName('task', false)}"`;
  const projectColumn = computeMorphOrRelationFieldJoinColumnName({
    name: 'project',
  });

  return `SELECT json_build_object(
    'templates', (SELECT count(*) FROM ${applicationTable('document')} WHERE kind = 'TEMPLATE'),
    'projects', (SELECT count(*) FROM ${applicationTable('project')}),
    'projectTasks', (SELECT count(*) FROM ${taskTable} WHERE "${projectColumn}" IS NOT NULL),
    'milestones', (SELECT count(*) FROM ${applicationTable('milestone')}),
    'channels', (SELECT count(*) FROM ${applicationTable('chatChannel')})
  )`;
};
