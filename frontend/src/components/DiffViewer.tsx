import { CopyableText } from './CopyableText'

export function DiffViewer({ paths }: { paths: string[] }) {
  return (
    <ul className="diff-list">
      {paths.map((path) => (
        <li key={path}>
          <CopyableText text={path} label="surface path" />
        </li>
      ))}
    </ul>
  )
}
