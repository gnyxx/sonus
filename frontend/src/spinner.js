import React from "react";
import { Bars } from "react-loader-spinner";

const Spinner = () => {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
      <Bars
        height="80"
        width="80"
        color="rgb(116, 12, 116)"
        ariaLabel="loading"
      />
    </div>
  );
};

export default Spinner;
