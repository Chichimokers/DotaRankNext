import DotaTable from "./components/DotaTable";
import IdValue from "./components/IDvalue";


export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Ranking de Dota</h1>
      <IdValue/>
      <DotaTable />
    </main>
  );
}