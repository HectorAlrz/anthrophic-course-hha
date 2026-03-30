import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();

vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();

vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();

vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// Import after mocks are set up
const { useAuth } = await import("@/hooks/use-auth");

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  });

  it("starts with isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    it("calls signInAction with email and password", async () => {
      mockSignInAction.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "password123");
    });

    it("sets isLoading true during sign in and false after", async () => {
      let resolveSignIn!: (value: { success: boolean }) => void;
      mockSignInAction.mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<unknown>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("sets isLoading false even when signInAction throws", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.signIn("test@example.com", "pass")
        ).rejects.toThrow("Network error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("returns the result from signInAction", async () => {
      const expected = { success: false, error: "Invalid credentials" };
      mockSignInAction.mockResolvedValue(expected);
      const { result } = renderHook(() => useAuth());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signIn("test@example.com", "wrong");
      });

      expect(returnValue).toEqual(expected);
    });

    it("does not navigate on failed sign in", async () => {
      mockSignInAction.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "wrong");
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    describe("on successful sign in", () => {
      it("creates project from anon work and navigates when anon work exists", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: { "/App.tsx": "export default function App() {}" },
        };
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "pass");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^Design from /),
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        });
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockRouterPush).toHaveBeenCalledWith("/anon-project-id");
        expect(mockGetProjects).not.toHaveBeenCalled();
      });

      it("does not use anon work when anon work has no messages", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
        mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "pass");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockClearAnonWork).not.toHaveBeenCalled();
        expect(mockRouterPush).toHaveBeenCalledWith("/existing-project");
      });

      it("navigates to existing project when no anon work", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([
          { id: "project-1" },
          { id: "project-2" },
        ]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "pass");
        });

        expect(mockRouterPush).toHaveBeenCalledWith("/project-1");
        expect(mockCreateProject).not.toHaveBeenCalled();
      });

      it("creates a new project and navigates when no anon work and no existing projects", async () => {
        mockSignInAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "brand-new-id" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "pass");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #/),
          messages: [],
          data: {},
        });
        expect(mockRouterPush).toHaveBeenCalledWith("/brand-new-id");
      });
    });
  });

  describe("signUp", () => {
    it("calls signUpAction with email and password", async () => {
      mockSignUpAction.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("new@example.com", "password123");
    });

    it("sets isLoading true during sign up and false after", async () => {
      let resolveSignUp!: (value: { success: boolean }) => void;
      mockSignUpAction.mockReturnValue(
        new Promise((resolve) => {
          resolveSignUp = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<unknown>;
      act(() => {
        signUpPromise = result.current.signUp("new@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false });
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("sets isLoading false even when signUpAction throws", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Server error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.signUp("new@example.com", "pass")
        ).rejects.toThrow("Server error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("returns the result from signUpAction", async () => {
      const expected = { success: false, error: "Email already in use" };
      mockSignUpAction.mockResolvedValue(expected);
      const { result } = renderHook(() => useAuth());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "pass");
      });

      expect(returnValue).toEqual(expected);
    });

    it("does not navigate on failed sign up", async () => {
      mockSignUpAction.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "pass");
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    describe("on successful sign up", () => {
      it("creates project from anon work and navigates when anon work exists", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "make a button" }],
          fileSystemData: { "/Button.tsx": "export default function Button() {}" },
        };
        mockSignUpAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockCreateProject.mockResolvedValue({ id: "signup-anon-id" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("new@example.com", "pass");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^Design from /),
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        });
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockRouterPush).toHaveBeenCalledWith("/signup-anon-id");
      });

      it("creates a new project and navigates when no anon work and no existing projects", async () => {
        mockSignUpAction.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "fresh-project-id" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("brand-new@example.com", "pass");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #/),
          messages: [],
          data: {},
        });
        expect(mockRouterPush).toHaveBeenCalledWith("/fresh-project-id");
      });
    });
  });
});
