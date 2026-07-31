import { Loader2 } from 'lucide-react'

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-accent" />
    </div>
  )
}

export default Loading
