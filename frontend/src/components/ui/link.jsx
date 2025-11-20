/**
 * Link component wrapper using Headless UI DataInteractive
 * This ensures proper handling of client-side router integration
 */

import * as Headless from "@headlessui/react";
import { forwardRef } from "@preact/compat";

export const Link = forwardRef(function Link(props, ref) {
  return (
    <Headless.DataInteractive>
      <a {...props} ref={ref} />
    </Headless.DataInteractive>
  );
});
