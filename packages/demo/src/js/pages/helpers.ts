export function fillSelectOptions(elementId: string, options: any): void {
  const element = document.querySelector<HTMLElement>(elementId);
  if (element === undefined || element === null) {
    throw new Error(`element: ${elementId} not found!`);
  }

  let optionsHtml = "";
  for (const key in options) {
    const value = options[key];
    optionsHtml += `<option value="${value}">${key}</option>\n`;
  }
  element.innerHTML = optionsHtml;
}

const getInputValue = (id: string): string | undefined => {
  return document.querySelector<HTMLInputElement>(id)?.value;
};

const checkValue = (name: string, value: string | undefined) => {
  if (!value) {
    const msg = `${name} is required!`;
    alert(msg);
    throw new Error(msg);
  }
};

export const getRequiredInputValue = (id: string): string => {
  const value: string | undefined = getInputValue(id);
  checkValue(id, value);
  return value as string;
};

export function createGetRequiredInputValue(prefix: string) {
  return (id: string) => {
    return getRequiredInputValue(prefix + id);
  };
}

export const SUBMIT_SUCCESS_MESSAGE =
  "Your transaction has been sent to godwoken, please wait for ~ 120 seconds for the tx to land on chain.";
