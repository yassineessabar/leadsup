import Image from 'next/image'

interface Platform {
  id: string
  name: string
  logo: string
}

interface PlatformCardProps {
  platform: Platform
  isSelected: boolean
  onSelect: (id: string) => void
}

export function PlatformCard({ platform, isSelected, onSelect }: PlatformCardProps) {
  return (
    <div
      className={`
        relative cursor-pointer transition-all duration-200
        bg-white rounded-md border-2 aspect-square
        flex flex-col items-center justify-center gap-4 p-4
        ${isSelected
          ? 'border-black'
          : 'border-gray-200 hover:border-gray-300'
        }
      `}
      onClick={() => onSelect(platform.id)}
    >
      <div className="h-12 w-12 rounded-[12px] flex items-center justify-center">
        <Image
          src={platform.logo}
          alt={platform.name}
          width={48}
          height={48}
          className="object-contain"
        />
      </div>
      <p className="text-black text-xs w-full truncate text-center font-semibold px-2">
        {platform.name}
      </p>
    </div>
  )
}