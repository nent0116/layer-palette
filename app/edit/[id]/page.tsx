import { Editor } from "@/components/editor"

interface EditorPageProps {
  params: {
    id: string
  }
}

export default function EditorPage({ params }: EditorPageProps) {
  return <Editor mapId={params.id} />
}
