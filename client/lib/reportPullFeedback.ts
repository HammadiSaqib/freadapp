export const REPORT_PULL_SUPPORT_PHONE = "(475) 259-8768";

const REPORT_PULL_LOADING_EVENT = "scoremachine:report-pull-loading";
const REPORT_PULL_SUCCESS_EVENT = "scoremachine:report-pull-success";
const REPORT_PULL_ERROR_EVENT = "scoremachine:report-pull-error";

export type ReportPullLoadingDetail = {
  title?: string;
  description?: string;
};

export type ReportPullErrorDetail = {
  title?: string;
  description?: string;
  supportPhone?: string;
};

const defaultLoadingDetail: Required<ReportPullLoadingDetail> = {
  title: "Pulling Client Report",
  description: "Securely connecting to the bureau portal, verifying credentials, and fetching the latest report.",
};

const defaultErrorDetail: Required<ReportPullErrorDetail> = {
  title: "We Couldn't Pull This Report",
  description: `Please double-check the monitoring email and password. If the client recently changed their password or the monitoring subscription needs renewal, update those details and try again. If you still face the same issue, contact support at ${REPORT_PULL_SUPPORT_PHONE}.`,
  supportPhone: REPORT_PULL_SUPPORT_PHONE,
};

function dispatchReportPullEvent<T>(eventName: string, detail?: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function openReportPullLoading(detail?: ReportPullLoadingDetail) {
  dispatchReportPullEvent(REPORT_PULL_LOADING_EVENT, {
    ...defaultLoadingDetail,
    ...detail,
  });
}

export function closeReportPullLoading() {
  dispatchReportPullEvent(REPORT_PULL_SUCCESS_EVENT);
}

export function showReportPullError(detail?: ReportPullErrorDetail) {
  dispatchReportPullEvent(REPORT_PULL_ERROR_EVENT, {
    ...defaultErrorDetail,
    ...detail,
  });
}

export function getReportPullErrorMessage(description?: string) {
  return description || defaultErrorDetail.description;
}

export async function runWithReportPullFeedback<T>(
  action: () => Promise<T>,
  options?: {
    loading?: ReportPullLoadingDetail;
    error?: ReportPullErrorDetail;
    closeOnSuccess?: boolean;
  },
) {
  openReportPullLoading(options?.loading);

  try {
    const result = await action();
    if (options?.closeOnSuccess !== false) {
      closeReportPullLoading();
    }
    return result;
  } catch (error) {
    showReportPullError(options?.error);
    throw error;
  }
}

export {
  REPORT_PULL_LOADING_EVENT,
  REPORT_PULL_SUCCESS_EVENT,
  REPORT_PULL_ERROR_EVENT,
};