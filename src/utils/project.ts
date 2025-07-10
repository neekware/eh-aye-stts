export function getProjectName(): string {
  const cwd = process.cwd();
  const pathParts = cwd.split('/').filter((part) => part.length > 0);
  return pathParts[pathParts.length - 1] || 'default';
}
