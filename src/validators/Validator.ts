import ProjectController from "../api/project/ProjectController";

export function ValidateProjectName(projectName: string): boolean {
  if (!projectName) {
    return false;
  }

  const invalidRegex = new RegExp('\\\\+|\/+');
  if (invalidRegex.test(projectName)) {
    return false;
  }

  const items = ProjectController.getProjects();
  let existingName = false;
  items.forEach((item) => {
    if (`${projectName}.json` === item.text || projectName === item.text) {
      existingName = true;
    }
  });

  return !existingName;
}
