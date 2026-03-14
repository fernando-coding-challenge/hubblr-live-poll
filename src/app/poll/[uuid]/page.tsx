import { PollView } from "./poll-view";

export default async function PollPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;

  return <PollView uuid={uuid} />;
}
