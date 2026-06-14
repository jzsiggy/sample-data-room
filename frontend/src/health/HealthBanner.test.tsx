import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HealthBanner } from "./HealthBanner";

describe("HealthBanner", () => {
  it("shows 'API: ok' when the API reports healthy", async () => {
    render(<HealthBanner />);

    expect(await screen.findByText("API: ok")).toBeInTheDocument();
  });
});
