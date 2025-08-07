import { Preview } from "@/components/preview"

interface PreviewPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params
  return <Preview mapId={id} />
}
