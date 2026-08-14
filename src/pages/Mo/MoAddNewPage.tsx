import { useState, useEffect, useMemo, useRef } from "react";
import MoNewForm from "../../components/mo/MoNewForm";
import { useStore } from "../../store/store";
import { ConfirmCancelDialog, MoLoadingPopup } from "../../components/mo/popup";
import styles from "./MoAddNewPage.module.css";

type Props = {
  onCancel: () => void;
};

export default function MoAddNewPage({ onCancel }: Props) {
  const authEmployee = useStore((s) => s.authEmployee);
  const fetchAvailableReportDivisions = useStore(
    (s) => s.fetchAvailableReportDivisions,
  );

  // Loading popup with minimum 1.5-second display time
  const [showLoading, setShowLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const loadingStartRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_LOADING_MS = 1500;

  // Cleanup timer on unmount
  useEffect(() => {
    loadingStartRef.current = Date.now();

    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  function onFetchDone() {
    const elapsed = Date.now() - loadingStartRef.current;
    const remaining = MIN_LOADING_MS - elapsed;
    if (remaining > 0) {
      loadingTimerRef.current = setTimeout(() => {
        setShowLoading(false);
      }, remaining);
    } else {
      setShowLoading(false);
    }
  }

  // Department is fixed to the authenticated employee's department.
  // Using a derived value avoids getting stuck on the initial fallback.
  const selectedDepartment = authEmployee?.department_id ?? 1;

  // List of divisions (เขต) for this department
  const [divisionList, setDivisionList] = useState<
    { id: number; name: string; shortName: string }[]
  >([]);

  // Combine departments and their divisions into one dictionary array
  const departmentOptions = useMemo(() => {
    const dept = authEmployee?.department_name
      ? {
          id: authEmployee.department_id ?? 1,
          department: authEmployee.department_name,
        }
      : null;

    return dept
      ? [
          {
            department: dept,
            divisions: divisionList,
          },
        ]
      : [];
  }, [authEmployee, divisionList]);

  // Fetch active divisions that do not already have today's report.
  useEffect(() => {
    if (!selectedDepartment) return;
    fetchAvailableReportDivisions(selectedDepartment)
      .then((divs) => {
        const opts = divs.map((d) => {
          return {
            id: d.division_id,
            name: d.division_name,
            shortName: d.division_name,
          };
        });
        setDivisionList(opts);
      })
      .finally(() => {
        onFetchDone();
      });
  }, [selectedDepartment, fetchAvailableReportDivisions]);

  function handleBack() {
    if (isDirty) {
      setShowConfirmCancel(true);
      return;
    }
    onCancel();
  }

  return (
    <>
      <MoLoadingPopup open={showLoading} />
      <ConfirmCancelDialog
        open={showConfirmCancel}
        onCancel={() => setShowConfirmCancel(false)}
        onConfirm={() => {
          setShowConfirmCancel(false);
          onCancel();
        }}
      />

      {!showLoading && (
        <MoNewForm
          selectedDivision={undefined}
          onCancel={onCancel}
          onDirtyChange={setIsDirty}
          departmentOptions={departmentOptions}
        />
      )}
      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={handleBack}
        >
          ย้อนกลับ
        </button>
      </div>
    </>
  );
}
