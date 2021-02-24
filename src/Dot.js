import React from "react";

const Dot = ({ x, y, z, d, dashed }) => {
    return (
        <div className="dot" style={{
            width:`${d}px`,
            height:`${d}px`,
            left: `${x - d / 2}px`,
            top: `${y - d / 2}px`,
            borderStyle: `${dashed ? "dashed" : "solid"}`
        }}/>
    )
}
export default Dot;
