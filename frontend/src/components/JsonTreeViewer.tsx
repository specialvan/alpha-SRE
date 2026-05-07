import type { JsonValue } from '../data/types'

function JsonNode({ name, value }: { name: string; value: JsonValue }) {
  if (value === null || typeof value !== 'object') {
    return (
      <li>
        <strong>{name}:</strong> {String(value)}
      </li>
    )
  }

  if (Array.isArray(value)) {
    return (
      <li>
        <details>
          <summary>
            {name} [{value.length}]
          </summary>
          <ul>
            {value.map((item, index) => (
              <JsonNode key={`${name}-${index}`} name={String(index)} value={item} />
            ))}
          </ul>
        </details>
      </li>
    )
  }

  return (
    <li>
      <details>
        <summary>{name}</summary>
        <ul>
          {Object.entries(value).map(([key, child]) => (
            <JsonNode key={key} name={key} value={child} />
          ))}
        </ul>
      </details>
    </li>
  )
}

export function JsonTreeViewer({
  value,
  label,
}: {
  value: JsonValue
  label: string
}) {
  const copy = async () => {
    await navigator.clipboard?.writeText(JSON.stringify(value, null, 2))
  }

  return (
    <section className="surface-card json-tree">
      <div className="json-tree__header">
        <h3>{label}</h3>
        <button type="button" onClick={copy}>
          复制 JSON
        </button>
      </div>
      <ul className="json-tree__list">
        <JsonNode name="根节点" value={value} />
      </ul>
    </section>
  )
}
