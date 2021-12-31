import React from 'react';
import * as styles from './index.module.scss';

const Spinner = () => (
  <svg
    className={styles.spinner}
    width="65px"
    height="65px"
    viewBox="0 0 66 66"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className={styles.path}
      fill="none"
      strokeWidth={6}
      strokeLinecap="round"
      cx={33}
      cy={33}
      r={30}
    ></circle>
  </svg>
);

export default Spinner;
