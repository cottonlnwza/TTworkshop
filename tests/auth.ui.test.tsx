// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthApp } from "../web/AuthApp.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("F-01 UI acceptance / synthetic browser", () => {
  it("STS-F01-08: form has accessible labels and required-field feedback", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status:401,ok:false,json:async()=>({error:{code:"UNAUTHENTICATED"}}) })));
    render(<AuthApp />);
    expect(await screen.findByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Sign in"}));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent",expect.stringContaining("required"));
  });
  it("STS-F01-01/02/06: authenticated role view and logout clears private UI state", async () => {
    const fetcher=vi.fn()
      .mockResolvedValueOnce({ok:false,status:401,json:async()=>({error:{code:"UNAUTHENTICATED"}})})
      .mockResolvedValueOnce({ok:true,status:200,json:async()=>({data:{user:{id:"u-1",email:"organizer.a@example.test",role:"ORGANIZER"}}})})
      .mockResolvedValueOnce({ok:true,status:204,json:async()=>({})});
    vi.stubGlobal("fetch", fetcher);
    render(<AuthApp />);
    fireEvent.change(await screen.findByLabelText("Email"),{target:{value:"organizer.a@example.test"}});
    fireEvent.change(screen.getByLabelText("Password"),{target:{value:"synthetic-example"}});
    fireEvent.click(screen.getByRole("button",{name:"Sign in"}));
    expect(await screen.findByText(/Organizer workspace/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Sign out"}));
    await waitFor(()=>expect(screen.queryByText(/Organizer workspace/)).toBeNull());
    expect(screen.getByRole("button",{name:"Sign in"})).toBeTruthy();
  });
  it("STS-F01-03/04: invalid login and expired session show safe feedback", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({status:401,ok:false,json:async()=>({error:{code:"UNAUTHENTICATED"}})})
      .mockResolvedValueOnce({status:401,ok:false,json:async()=>({error:{code:"INVALID_CREDENTIALS",message:"Invalid credentials"}})}));
    render(<AuthApp />);
    fireEvent.change(await screen.findByLabelText("Email"),{target:{value:"participant.a@example.test"}});
    fireEvent.change(screen.getByLabelText("Password"),{target:{value:"wrong"}});
    fireEvent.click(screen.getByRole("button",{name:"Sign in"}));
    expect((await screen.findByRole("alert")).textContent).toContain("Invalid credentials");
    expect(screen.queryByText(/workspace/)).toBeNull();
  });
});
