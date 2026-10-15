import LoadingModal from "@/components/registeration/LoadingModal";

type Props = {
  open: boolean;
  message?: string;
};

export default function MoLoadingPopup({ open, message }: Props) {
  return <LoadingModal isOpen={open} message={message} />;
}
