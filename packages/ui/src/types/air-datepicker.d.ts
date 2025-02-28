declare module 'air-datepicker' {
  export interface AirDatepickerOptions {
    classes?: string;
    inline?: boolean;
    locale?: {
      days?: string[];
      daysShort?: string[];
      daysMin?: string[];
      months?: string[];
      monthsShort?: string[];
      today?: string;
      clear?: string;
      dateFormat?: string;
      timeFormat?: string;
      firstDay?: number;
    };
    startDate?: Date | string;
    firstDay?: number;
    weekends?: number[];
    dateFormat?: string;
    altField?: string | HTMLElement;
    altFieldDateFormat?: string;
    toggleSelected?: boolean;
    keyboardNav?: boolean;
    selectedDates?: (Date | string)[];
    range?: boolean;
    multipleDates?: boolean | number;
    multipleDatesSeparator?: string;
    view?: 'days' | 'months' | 'years';
    minView?: 'days' | 'months' | 'years';
    showOtherMonths?: boolean;
    selectOtherMonths?: boolean;
    moveToOtherMonthsOnSelect?: boolean;
    showOtherYears?: boolean;
    selectOtherYears?: boolean;
    moveToOtherYearsOnSelect?: boolean;
    minDate?: Date | string;
    maxDate?: Date | string;
    disableNavWhenOutOfRange?: boolean;
    position?: string;
    offset?: number;
    container?: string | HTMLElement;
    onSelect?: (formattedDate: string, date: Date | Date[], instance: AirDatepicker) => void;
    onShow?: (instance: AirDatepicker) => void;
    onHide?: (instance: AirDatepicker) => void;
    onChangeMonth?: (month: number, year: number) => void;
    onChangeYear?: (year: number) => void;
    onChangeDecade?: (decade: number[]) => void;
    onChangeView?: (view: string) => void;
    onRenderCell?: (date: Date, cellType: string) => { disabled?: boolean; classes?: string; html?: string } | void;
  }

  export interface AirDatepicker {
    show(): void;
    hide(): void;
    next(): void;
    prev(): void;
    selectDate(date: Date | Date[] | string | string[], opts?: { silent?: boolean }): void;
    unselectDate(date: Date | string): void;
    clear(): void;
    update(newOptions: Partial<AirDatepickerOptions>): void;
    destroy(): void;
  }

  export default class AirDatepickerConstructor {
    constructor(selector: string | HTMLElement, options?: AirDatepickerOptions);
    readonly $datepicker: HTMLDivElement;
    readonly selectedDates: Date[];
    readonly focused: Date;
    readonly view: string;
    readonly currentView: string;
    readonly visible: boolean;
    show(): void;
    hide(): void;
    next(): void;
    prev(): void;
    selectDate(date: Date | Date[] | string | string[], opts?: { silent?: boolean }): void;
    unselectDate(date: Date | string): void;
    clear(): void;
    update(newOptions: Partial<AirDatepickerOptions>): void;
    destroy(): void;
  }
}
