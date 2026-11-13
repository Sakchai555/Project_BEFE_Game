import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AuthDialog } from "./AuthDialog";
import { ProfileDialog } from "./ProfileDialog";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("authentication and profile dialogs", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("signup dialog renders the name, confirmation, and account error", () => {
    act(() =>
      root.render(
        React.createElement(AuthDialog, {
          open: true,
          mode: "signup",
          setMode: jest.fn(),
          name: "PlayerOne",
          setName: jest.fn(),
          email: "player@example.com",
          setEmail: jest.fn(),
          password: "password123",
          setPassword: jest.fn(),
          confirm: "password123",
          setConfirm: jest.fn(),
          error: "ชื่อนี้ถูกใช้แล้ว กรุณาเปลี่ยนชื่อ",
          busy: false,
          onClose: jest.fn(),
          onSubmit: jest.fn(),
        }),
      ),
    );

    expect(
      container.querySelector('input[autocomplete="name"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('input[autocomplete="new-password"]'),
    ).not.toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "ชื่อนี้ถูกใช้แล้ว",
    );
    expect(
      container.querySelector('button[type="submit"]').textContent,
    ).toContain("สร้างบัญชี");
  });

  test("login dialog omits signup fields and disables submit while busy", () => {
    act(() =>
      root.render(
        React.createElement(AuthDialog, {
          open: true,
          mode: "login",
          setMode: jest.fn(),
          name: "",
          setName: jest.fn(),
          email: "player@example.com",
          setEmail: jest.fn(),
          password: "password123",
          setPassword: jest.fn(),
          confirm: "",
          setConfirm: jest.fn(),
          error: "",
          busy: true,
          onClose: jest.fn(),
          onSubmit: jest.fn(),
        }),
      ),
    );

    expect(container.querySelector('input[autocomplete="name"]')).toBeNull();
    expect(
      container.querySelector('input[autocomplete="new-password"]'),
    ).toBeNull();
    expect(container.querySelector('button[type="submit"]').disabled).toBe(
      true,
    );
    expect(
      container.querySelector('button[type="submit"]').textContent,
    ).toContain("กำลังตรวจสอบ");
  });

  test("profile dialog shows the account email and submits without a checkmark", () => {
    const onSubmit = jest.fn((event) => event.preventDefault());
    act(() =>
      root.render(
        React.createElement(ProfileDialog, {
          user: { email: "player@example.com" },
          name: "PlayerOne",
          setName: jest.fn(),
          password: "",
          setPassword: jest.fn(),
          confirm: "",
          setConfirm: jest.fn(),
          error: "",
          busy: false,
          onClose: jest.fn(),
          onSubmit,
        }),
      ),
    );

    const email = container.querySelector('input[type="email"]');
    const submit = container.querySelector('button[type="submit"]');
    expect(email.value).toBe("player@example.com");
    expect(email.readOnly).toBe(true);
    expect(container.textContent).not.toContain(
      "เว้นว่างไว้หากไม่ต้องการเปลี่ยน",
    );
    expect(submit.textContent).toContain("บันทึกการเปลี่ยนแปลง");
    expect(submit.textContent).not.toContain("✓");

    act(() =>
      container
        .querySelector("form")
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
