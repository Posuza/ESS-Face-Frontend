import MoSummariesForm from "./DetailView/MoSummariesForm";
import MoSectorDetailForm from "./DetailView/MoSectorDetailForm";

type Props =
  | {
      view: "sector";
      selectedTransactionId: number;
      departmentId?: number | null;
      selectedDate?: string;
    }
  | {
      view: "summary";
      selectedTransactionId?: null;
      departmentId?: number | null;
      selectedDate?: string;
    };

export default function DetailViewer(props: Props) {
  switch (props.view) {
    case "sector":
      return (
        <MoSectorDetailForm
          selectedTransactionId={props.selectedTransactionId}
        />
      );
    case "summary":
      return (
        <MoSummariesForm
          departmentId={props.departmentId}
          selectedDate={props.selectedDate}
        />
      );
    default:
      // TypeScript exhaustiveness — this line is unreachable if Props is correct
      return null;
  }
}
