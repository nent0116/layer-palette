import { Preview } from "@/components/preview"

interface PreviewPageProps {
  params: {
    id: string
  }
}

export default function PreviewPage({ params }: PreviewPageProps) {
  return <Preview mapId={params.id} />
}
