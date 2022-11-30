import defaultLocale from '../locale/default';

export interface ModalLocale {
  okText: string;
  cancelText: string;
  justOkText: string;
}

let runtimeLocale: ModalLocale = {
  ...(defaultLocale.Modal as ModalLocale),
};

/**
 * ChangeConfirmLocale 覆盖 runtimeLocale 的 modal
 *
 * @param newLocale 新配置的 newLocale
 */
export function changeConfirmLocale(newLocale?: ModalLocale) {
  if (newLocale) {
    runtimeLocale = {
      ...runtimeLocale,
      ...newLocale,
    };
  } else {
    runtimeLocale = {
      ...(defaultLocale.Modal as ModalLocale),
    };
  }
}

export function getConfirmLocale() {
  return runtimeLocale;
}
