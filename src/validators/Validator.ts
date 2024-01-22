// eslint-disable-next-line import/no-cycle
import ProjectController from '../api/project/ProjectController';

// eslint-disable-next-line import/prefer-default-export
export function ValidateProjectName(projectName: string): boolean {
  if (!projectName) {
    return false;
  }

  const invalidRegex = /\\+|\/+/;
  if (invalidRegex.test(projectName)) {
    return false;
  }

  const items = ProjectController.getProjects();
  let existingName = false;
  items.forEach((item: { text: string }) => {
    if (`${projectName}.json` === item.text || projectName === item.text) {
      existingName = true;
    }
  });

  return !existingName;
}
