import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { DataTable, type DataTableColumn } from "./DataTable.js";

interface Row {
  id: string;
  name: string;
  score: number;
}

const rows: Row[] = [
  { id: "1", name: "Asha Rao", score: 42 },
  { id: "2", name: "Priya Iyer", score: 88 },
];

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", render: (row) => row.name, sortable: true },
  { id: "score", header: "Score", render: (row) => row.score, align: "right" },
];

describe("DataTable", () => {
  it("renders a real table with a header row and one row per item", () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    const dataRows = within(screen.getByRole("table")).getAllByRole("row");
    // header row + 2 data rows
    expect(dataRows).toHaveLength(3);
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Priya Iyer")).toBeInTheDocument();
  });

  it("renders an optional caption", () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} caption="Leads" />);
    expect(screen.getByText("Leads").tagName).toBe("CAPTION");
  });

  it("marks the active sort column with aria-sort and calls onSortChange when its header is activated", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        sortBy="name"
        sortDirection="asc"
        onSortChange={onSortChange}
      />,
    );
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledWith("name");
  });

  it("does not render a sort button for a non-sortable column", () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} />);
    expect(screen.queryByRole("button", { name: /Score/ })).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Leads"
        sortBy="name"
        sortDirection="asc"
        onSortChange={() => {}}
      />,
    );
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
