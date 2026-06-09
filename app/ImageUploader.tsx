import clsx from "clsx";
import { useRef, useState, useTransition } from "react";
import Spinner from "./Spinner";

export function ImageUploader({
  onUpload,
}: {
  onUpload: ({
    url,
    width,
    height,
  }: {
    url: string;
    width: number;
    height: number;
  }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleUpload(file: File) {
    startTransition(async () => {
      // 讀取圖片尺寸
      const width = await new Promise<number>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(img.naturalWidth);
        img.src = URL.createObjectURL(file);
      });
      const height = await new Promise<number>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(img.naturalHeight);
        img.src = URL.createObjectURL(file);
      });

      // 轉成 base64 data URL
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      onUpload({
        url: base64,
        width: width ?? 1024,
        height: height ?? 768,
      });
    });
  }

  return (
    <button
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const data = e.dataTransfer;
        const file = data?.files?.[0];
        if (file) {
          handleUpload(file);
        }
      }}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => {
        setIsDragging(false);
      }}
      onClick={() => {
        fileInputRef.current?.click();
      }}
      className={clsx(
        isDragging && "text-gray-400",
        !isDragging && !pending && "text-gray-700 hover:text-gray-400",
        "relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center rounded-xl bg-gray-900 focus-visible:text-gray-400 focus-visible:outline-none",
      )}
    >
      <svg
        className={clsx("absolute inset-0 transition-colors")}
        viewBox="0 0 400 300"
      >
        <rect
          x=".5"
          y=".5"
          width="399"
          height="299"
          rx="6"
          ry="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8,10"
        />
      </svg>

      {!pending ? (
        <>
          <div className="flex grow flex-col justify-center">
            <p className="text-xl text-white">拖曳照片到這裡</p>
            <p className="mt-1 text-gray-500">或點擊上傳</p>
          </div>

          <div className="pb-4 flex items-center justify-center flex-row gap-2">
            <p className="text-sm text-gray-500">
              Powered by
            </p>
            <img src="/poweredby.png" className="h-[20px]" />
          </div>
        </>
      ) : (
        <div className="text-white">
          <Spinner />
          <p className="mt-2 text-lg">上傳中...</p>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleUpload(file);
          }
        }}
        ref={fileInputRef}
      />
    </button>
  );
}
