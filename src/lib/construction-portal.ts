export function selectDevelopmentName(projects: { developmentName: string }[], requested?: string) {
  return projects.find((project) => project.developmentName === requested)?.developmentName ?? projects[0]?.developmentName;
}
