// this suck ass, but works for now.
export function Crosshair() {
    return (
        <div
            style={{
                position: "fixed",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 1000,
            }}
        >
            {/* Vertical line */}
            <div
                style={{
                    position: "absolute",
                    left: "calc(50% - 1px)",
                    top: "calc(50% - 16px)",
                    width: "2px",
                    height: "32px",
                    background: "#00ff00",
                    borderRadius: "1px",
                }}
            />
            {/* Horizontal line */}
            <div
                style={{
                    position: "absolute",
                    left: "calc(50% - 16px)",
                    top: "calc(50% - 1px)",
                    width: "32px",
                    height: "2px",
                    background: "#00ff00",
                    borderRadius: "1px",
                }}
            />
        </div>
    );
}