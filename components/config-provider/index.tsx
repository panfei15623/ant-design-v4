import IconContext from '@ant-design/icons/lib/components/Context';
import { FormProvider as RcFormProvider } from 'rc-field-form';
import type { ValidateMessages } from 'rc-field-form/lib/interface';
import useMemo from 'rc-util/lib/hooks/useMemo';
import * as React from 'react';
import type { RequiredMark } from '../form/Form';
import type { Locale } from '../locale-provider';
import LocaleProvider, { ANT_MARK } from '../locale-provider';
import LocaleReceiver from '../locale-provider/LocaleReceiver';
import defaultLocale from '../locale/default';
import message from '../message';
import notification from '../notification';
import type { Theme } from './context';
import {
  ConfigConsumer,
  ConfigConsumerProps,
  ConfigContext,
  CSPConfig,
  DirectionType,
} from './context';
import { registerTheme } from './cssVariables';
import { RenderEmptyHandler } from './defaultRenderEmpty';
import { DisabledContextProvider } from './DisabledContext';
import type { SizeType } from './SizeContext';
import SizeContext, { SizeContextProvider } from './SizeContext';

export {
  RenderEmptyHandler,
  ConfigContext,
  ConfigConsumer,
  CSPConfig,
  DirectionType,
  ConfigConsumerProps,
};

export const configConsumerProps = [
  'getTargetContainer',
  'getPopupContainer',
  'rootPrefixCls',
  'getPrefixCls',
  'renderEmpty',
  'csp',
  'autoInsertSpaceInButton',
  'locale',
  'pageHeader',
];

// These props is used by `useContext` directly in sub component
const PASSED_PROPS: Exclude<keyof ConfigConsumerProps, 'rootPrefixCls' | 'getPrefixCls'>[] = [
  'getTargetContainer', // 配置 Affix、Anchor 滚动监听容器。
  'getPopupContainer', // 弹出框（Select, Tooltip, Menu 等等）渲染父节点，默认渲染到 body 上。
  'renderEmpty', // 自定义组件空状态
  'pageHeader', // 统一设置 PageHeader 的 ghost，参考 PageHeader
  'input', // 设置 Input 组件的通用属性
  'pagination',
  'form', // 设置 Form 组件的通用属性
];

export interface ConfigProviderProps {
  getTargetContainer?: () => HTMLElement | Window;
  getPopupContainer?: (triggerNode?: HTMLElement) => HTMLElement;
  prefixCls?: string;
  iconPrefixCls?: string;
  children?: React.ReactNode;
  renderEmpty?: RenderEmptyHandler;
  csp?: CSPConfig;
  autoInsertSpaceInButton?: boolean;
  form?: {
    validateMessages?: ValidateMessages;
    requiredMark?: RequiredMark;
    colon?: boolean;
  };
  input?: {
    autoComplete?: string;
  };
  pagination?: {
    showSizeChanger?: boolean;
  };
  locale?: Locale;
  pageHeader?: {
    ghost: boolean;
  };
  componentSize?: SizeType;
  componentDisabled?: boolean;
  direction?: DirectionType;
  space?: {
    size?: SizeType | number;
  };
  virtual?: boolean;
  dropdownMatchSelectWidth?: boolean;
}

interface ProviderChildrenProps extends ConfigProviderProps {
  parentContext: ConfigConsumerProps;
  legacyLocale: Locale;
}

export const defaultPrefixCls = 'ant';
export const defaultIconPrefixCls = 'anticon';
let globalPrefixCls: string;
let globalIconPrefixCls: string;

function getGlobalPrefixCls() {
  return globalPrefixCls || defaultPrefixCls;
}

function getGlobalIconPrefixCls() {
  return globalIconPrefixCls || defaultIconPrefixCls;
}

const setGlobalConfig = ({
  prefixCls,
  iconPrefixCls,
  theme,
}: Pick<ConfigProviderProps, 'prefixCls' | 'iconPrefixCls'> & { theme?: Theme }) => {
  if (prefixCls !== undefined) {
    globalPrefixCls = prefixCls;
  }
  if (iconPrefixCls !== undefined) {
    globalIconPrefixCls = iconPrefixCls;
  }

  if (theme) {
    registerTheme(getGlobalPrefixCls(), theme);
  }
};

export const globalConfig = () => ({
  getPrefixCls: (suffixCls?: string, customizePrefixCls?: string) => {
    if (customizePrefixCls) return customizePrefixCls;
    return suffixCls ? `${getGlobalPrefixCls()}-${suffixCls}` : getGlobalPrefixCls();
  },
  getIconPrefixCls: getGlobalIconPrefixCls,
  getRootPrefixCls: (rootPrefixCls?: string, customizePrefixCls?: string) => {
    // Customize rootPrefixCls is first priority
    if (rootPrefixCls) {
      return rootPrefixCls;
    }

    // If Global prefixCls provided, use this
    if (globalPrefixCls) {
      return globalPrefixCls;
    }

    // [Legacy] If customize prefixCls provided, we cut it to get the prefixCls
    if (customizePrefixCls && customizePrefixCls.includes('-')) {
      return customizePrefixCls.replace(/^(.*)-[^-]*$/, '$1');
    }

    // Fallback to default prefixCls
    return getGlobalPrefixCls();
  },
});

const ProviderChildren: React.FC<ProviderChildrenProps> = props => {
  // ConfigProvider 为组件提供统一的全局化配置
  const {
    children, // ConfigProvider 的 children
    csp, // 设置 Content Security Policy 配置
    autoInsertSpaceInButton, // 设置为 false 时，移除按钮中 2 个汉字之间的空格
    form, // 设置 Form 组件的通用属性
    locale, // ConfigProvider 配置的 locale
    componentSize, // 设置 antd 组件大小
    direction, // 设置文本展示方向
    space, // 设置 Space 的 size
    virtual, // 设置 false 时关闭虚拟滚动
    dropdownMatchSelectWidth, // 下拉菜单和选择器同宽。默认将设置 min-width，当值小于选择框宽度时会被忽略。false 时会关闭虚拟滚动
    legacyLocale, // 旧版 locale，不是 ConfigProvider 配置项
    parentContext, // { getPrefixCls: (suffixCls?: string, customizePrefixCls?: string) => string }
    iconPrefixCls, // 设置图标统一样式前缀，默认 anticon。注意：需要配合 less 变量 @iconfont-css-prefix 使用
    componentDisabled, // 设置 antd 组件禁用状态
  } = props;

  const getPrefixCls = React.useCallback(
    (suffixCls: string, customizePrefixCls?: string) => {
      // prefixCls：设置统一样式前缀。注意：需要配合 less 变量 @ant-prefix 使用，默认 ant
      const { prefixCls } = props;

      if (customizePrefixCls) return customizePrefixCls;

      // 得到 prefixCls || 'ant'
      const mergedPrefixCls = prefixCls || parentContext.getPrefixCls('');

      return suffixCls ? `${mergedPrefixCls}-${suffixCls}` : mergedPrefixCls;
    },
    [parentContext.getPrefixCls, props.prefixCls],
  );

  const config = {
    ...parentContext,
    csp,
    autoInsertSpaceInButton,
    locale: locale || legacyLocale,
    direction,
    space,
    virtual,
    dropdownMatchSelectWidth,
    getPrefixCls,
  };

  // Pass the props used by `useContext` directly with child component.
  // These props should merged into `config`.
  PASSED_PROPS.forEach(propName => {
    const propValue = props[propName];
    if (propValue) {
      (config as any)[propName] = propValue;
    }
  });

  // https://github.com/ant-design/ant-design/issues/27617
  const memoedConfig = useMemo(
    () => config,
    config,
    (prevConfig, currentConfig) => {
      const prevKeys = Object.keys(prevConfig) as Array<keyof typeof config>;
      const currentKeys = Object.keys(currentConfig) as Array<keyof typeof config>;
      return (
        prevKeys.length !== currentKeys.length ||
        prevKeys.some(key => prevConfig[key] !== currentConfig[key])
      );
    },
  );

  const memoIconContextValue = React.useMemo(
    () => ({ prefixCls: iconPrefixCls, csp }),
    [iconPrefixCls, csp],
  );

  let childNode = children;
  // Additional Form provider
  let validateMessages: ValidateMessages = {};

  if (locale) {
    validateMessages =
      locale.Form?.defaultValidateMessages || defaultLocale.Form?.defaultValidateMessages || {};
  }

  // 合并 form validateMessages 配置
  if (form && form.validateMessages) {
    validateMessages = { ...validateMessages, ...form.validateMessages };
  }

  // 以下 provider 层层包裹

  // 处理 Form validateMessages
  if (Object.keys(validateMessages).length > 0) {
    childNode = <RcFormProvider validateMessages={validateMessages}>{children}</RcFormProvider>;
  }

  if (locale) {
    // 得到 LocaleContext.Provider
    childNode = (
      <LocaleProvider locale={locale} _ANT_MARK__={ANT_MARK}>
        {childNode}
      </LocaleProvider>
    );
  }

  // 处理 Icon
  if (iconPrefixCls || csp) {
    childNode = (
      <IconContext.Provider value={memoIconContextValue}>{childNode}</IconContext.Provider>
    );
  }

  // 处理 Size
  if (componentSize) {
    childNode = <SizeContextProvider size={componentSize}>{childNode}</SizeContextProvider>;
  }

  // 处理 disabled
  if (componentDisabled !== undefined) {
    childNode = (
      <DisabledContextProvider disabled={componentDisabled}>{childNode}</DisabledContextProvider>
    );
  }

  return <ConfigContext.Provider value={memoedConfig}>{childNode}</ConfigContext.Provider>;
};

// ConfigProvider 组件入口
const ConfigProvider: React.FC<ConfigProviderProps> & {
  ConfigContext: typeof ConfigContext;
  SizeContext: typeof SizeContext;
  config: typeof setGlobalConfig;
} = props => {
  React.useEffect(() => {
    if (props.direction) {
      message.config({
        rtl: props.direction === 'rtl',
      });
      notification.config({
        rtl: props.direction === 'rtl',
      });
    }
  }, [props.direction]);

  return (
    <LocaleReceiver>
      {(_, __, legacyLocale) => (
        <ConfigConsumer>
          {(context: {
            getPrefixCls: (suffixCls?: string, customizePrefixCls?: string) => string;
          }) => <ProviderChildren parentContext={context} legacyLocale={legacyLocale} {...props} />}
        </ConfigConsumer>
      )}
    </LocaleReceiver>
  );
};

/** @private internal Usage. do not use in your production */
ConfigProvider.ConfigContext = ConfigContext;
ConfigProvider.SizeContext = SizeContext;
ConfigProvider.config = setGlobalConfig;

export default ConfigProvider;
