export default function Toast({ message }: { message: string }) {
  return <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow">{message}</div>;
}
