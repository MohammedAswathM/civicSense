const rows = [
  ['Ward 1 - Central', '86%', '14h', '5'],
  ['Ward 4 - South', '61%', '26h', '12'],
  ['Ward 2 - North', '79%', '19h', '7'],
];

export default function WardLeaderboard() {
  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <h2 className="border-b border-gray-200 p-4 text-lg font-semibold">Ward Leaderboard</h2>
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="p-3">Ward</th>
            <th className="p-3">SLA</th>
            <th className="p-3">Average</th>
            <th className="p-3">Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-gray-100">
              {row.map((cell) => <td key={cell} className="p-3">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
