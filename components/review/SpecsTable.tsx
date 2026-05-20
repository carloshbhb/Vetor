interface SpecsTableProps {
  specs: { label: string; value: string }[];
}

export default function SpecsTable({ specs }: SpecsTableProps) {
  return (
    <table className="specs-table">
      <thead>
        <tr>
          <th scope="col">Especificação</th>
          <th scope="col">Detalhe</th>
        </tr>
      </thead>
      <tbody>
        {specs.map((s, i) => (
          <tr key={i}>
            <td>{s.label}</td>
            <td dangerouslySetInnerHTML={{ __html: s.value }} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}
