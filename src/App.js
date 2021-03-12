import React, { useState, useEffect } from "react";
import { EigenvalueDecomposition, Matrix } from "ml-matrix";
// import Dot from "./Dot";
import Input from "./Input";
import Line from "./Line";
// import Square from "./Square";
import Body from "./Body";

const App = () => {
    const nx = 700;
    const ny = 700;
    // following is solely needed for list comprehensions
    const [xyz] = useState(new Array(3).fill(0));
    // const colors = ["red", "green", "blue"];
    const [LzInput, setLzInput] = useState("1");
    const [Lz, setLz] = useState(Number(LzInput));
    const [thsInput, setThsInput] = useState(["0", "0.1", "0"]);
    const [ths, setThs] = useState(thsInput.map(elem => Number(elem)));
    const [momsInput, setMomsInput] = useState(["4", "3", "2"]);
    const [firstMoms, setFirstMoms] = useState(momsInput.map(elem => Number(elem)));
    const [moms, setMoms] = useState(momsInput.map(elem => Number(elem)));
    const [omsInput] = useState(["", "", ""]);
    const [oms, setOms] = useState(omsInput.map(elem => Number(elem)));
    const [omfs, setOmfs] = useState([0, 0, 0]);
    const [, setLs] = useState([0, 0, 0]);
    const [labLs, setLabLs] = useState([0, 0, 0]);
    const [om2, setOm2] = useState(0);
    const [omf, setOmf] = useState(0);
    const [L2, setL2] = useState(0);
    const [K, setK] = useState(0);
    const [mids0, setMids0] = useState([]);
    const [mids, setMids] = useState([]);
    const [running, setRunning] = useState(false);
    const [time, setTime] = useState(0);
    // const [angleVecs, setAngleVecs] = useState([[]]);
    const [angleVec, setAngleVec] = useState([]);
    const [d, setD] = useState([nx / 3, nx / 3, nx / 3]);
    const [areLegalMoms, setAreLegalMoms] = useState(true);
    const [degeneracies, setDegeneracies] = useState(new Array(3).fill(false));
    const [shape, setShape] = useState(0);
    const [types, setTypes] = useState([]);
    const [zAxis, setZAxis] = useState(0);
    const [legalOrder, setLegalOrder] = useState(true);

    // ODE-solver timestep in ms
    const dt = 50;

    // helpful linear algebra functions:
    const dotproduct = (vec1, vec2) => vec1.reduce((dot, comp, i) => dot + comp * vec2[i], 0);
    // const mult1 = (mat, vec) => mat.reduce((prod, row, i) => [...prod, dotproduct(row, vec)], []);
    const mult1 = (mat, vec) => mat.map(row => dotproduct(row, vec));
    const transpose = mat => mat[0].map((blah, i) => mat.map(row => row[i]));
    const mult2 = (mat1, mat2) => mat1.map(x => transpose(mat2).map(y => dotproduct(x, y)));

    const zRot = th => {
        let [c, s] = [Math.cos(th), Math.sin(th)];
        return [[c, s, 0], [-s, c, 0], [0, 0, 1]];
    }
    const xRot = th => {
        let [c, s] = [Math.cos(th), Math.sin(th)];
        return [[1, 0, 0], [0, c, s], [0, -s, c]];
    }

    // const rot = ths => mult2(mult2(zRot(ths[2]), xRot(ths[1])), zRot(ths[0]));
    const invRot=ths=> mult2(mult2(zRot(-ths[0]),xRot(-ths[1])), zRot(-ths[2]));

    useEffect(() => {
        let sumMom = moms[0] + moms[1] + moms[2];
        let newD = moms.map(mom => Math.max(0.000001, Math.sqrt((sumMom / 2 - mom))));
        let dMax = newD.reduce((max, d) => Math.max(d, max));
        newD = newD.map(d => nx * d / dMax / 4);
        setD(newD);
        // replace this using reduce?
        const newMids0 = [];
        xyz.forEach((row, i) => {
            let mid1 = [...xyz];
            mid1[i] = newD[i];
            let mid2 = [...xyz];
            mid2[i] = -newD[i];
            newMids0.push(mid1, mid2);
        })
        setMids0(newMids0);
    }, [moms, xyz]);

    const rotationStuff = () => {
        setMids(mids0.map((mid, i) => mult1(invRot(ths), mid)));
        setAngleVec(rotate(invRot(ths)));
    }
    useEffect(() => rotationStuff(), [mids0, ths]);

    const rotate = mat => {
        let trace = mat[0][0] + mat[1][1] + mat[2][2];
        let angle = Math.acos((trace - 1) / 2);
        let vectors = new EigenvalueDecomposition(new Matrix(mat)).eigenvectorMatrix.transpose().data;
        // Determine which eigenvector has eigenvalue = 1 (ie, is rotation axis)
        let dVectors = vectors.map(vector => mult1(mat, vector).map((comp, i) => comp - vector[i]));
        let mags = dVectors.map(dVector => dVector.reduce((mag, comp) => mag + comp * comp, 0));
        let min = mags.reduce((min, mag, i) => mag < min[1] ? [i, mag] : min, [-1, Infinity]);
        let axisVec = vectors[min[0]];
        let vec = vectors[(min[0] + 1) % 3];
        let rVec = mult1(mat, vec);
        // rewrite this using a double loop or double list-comprehension?
        let rVecCrossVec = [rVec[1] * vec[2] - rVec[2] * vec[1],
                            rVec[2] * vec[0] - rVec[0] * vec[2],
                            rVec[0] * vec[1] - rVec[1] * vec[0]];
        angle *= Math.sign(dotproduct(axisVec, rVecCrossVec));
        return [angle, axisVec];
    }

    // consolidate aspects of following event handlers?
    const handlerLz = e => {
        let newLz =  e.target.value;
        if (['', '-', '.', '-.'].includes(newLz)) return setLzInput(newLz);
        if (isNaN(Number(newLz))) return;
        setLzInput(newLz);
        setLz(Number(newLz));
    };

    const handlerTh = e => {
        let xyOrZ = Number(e.target.name);
        let th =  e.target.value;
        let newThsInput = [...thsInput]
        let newThs = [...ths];
        if (['', '-','.', '-.'].includes(th)) {
            newThsInput[xyOrZ] = th;
        } else {
            if (isNaN(Number(th))) return;
            newThsInput[xyOrZ] = th;
            newThs[xyOrZ] = Number(th);
        }
        setThsInput(newThsInput);
        setThs(newThs);
        let newMids = [];
        mids0.forEach(mid => newMids.push(mult1(invRot(ths), mid)));
        setMids(newMids);
    };

    const handlerMom = e => {
        // let xyOrZ = Number(e.target.name);
        let name = Number(e.target.name);
        let mom = e.target.value;
        let newMomsInput = [...momsInput];
        let newMoms = [...firstMoms];
        if (['', '.'].includes(mom)) {
            newMomsInput[name] = mom;
        } else {
            let newMom = Number(mom);
            if (isNaN(newMom)) return;
            newMomsInput[name] = mom;
            newMoms[name] = newMom;
            if (shape === 1) {
                newMoms[1] = newMom;
                newMoms[2] = newMom;
                // setMoms(newMoms);
            }
            if (shape === 2 && name === 1) newMoms[2] = newMom;
            if (shape === 3) {
                console.log(newMoms, legalOrder);
                setLegalOrder(newMoms.reduce((legal, mom, i, moms) => (!i || (legal && mom < moms[i - 1])), true))
            }
            setAreLegalMoms(newMoms.reduce((legal, mom, i, moms) => (legal && mom <= (moms[(i+1)%3] + moms[(i+2)%3])), true));
        }
        setMomsInput(newMomsInput);
        setFirstMoms(newMoms);
        setMoms(newMoms);
    };

    useEffect(() => {
        let interval;
        if (running) interval = setInterval(() => setTime(time + dt/1000), dt);
        if (!running && time !== 0) clearInterval(interval);
        return () => clearInterval(interval);
    }, [running, time]);

    const Fs = ths => {
        let cs = [];
        let ss = [];
        for (const th of ths) {
            cs.push(Math.cos(th));
            ss.push(Math.sin(th));
        };
        let Fs = []
        Fs[0] = Lz * (cs[2] * cs[2] / moms[1] + ss[2] * ss[2] / moms[0]);
        Fs[1] = Lz * (1 / moms[0] - 1 / moms[1]) * ss[1] * ss[2] * cs[2];
        Fs[2] = Lz * (1 / moms[2] - cs[2] * cs[2] / moms[1] - ss[2] * ss[2] / moms[0]) * cs[1];
        let newOms = [];
        newOms[0] = Fs[0] * ss[1] * ss[2] + Fs[1] * cs[2];
        newOms[1] = Fs[0] * ss[1] * cs[2] - Fs[1] * ss[2];
        newOms[2] = Fs[0] * cs[1] + Fs[2];
        setOms(newOms);
        setOm2(newOms.reduce((om2, om) => om2 + om * om, 0));
        let newOmfs = [];
        newOmfs[0] = Fs[2] * ss[1] * ss[0] + Fs[1] * cs[0];
        newOmfs[1] =-Fs[2] * ss[1] * cs[0] + Fs[1] * ss[0];
        newOmfs[2] = Fs[2] * cs[1] + Fs[0];
        setOmfs(newOmfs);
        setOmf(Math.sqrt(newOmfs.reduce((om2, om) => om2 + om * om, 0)));
        let newLs = newOms.map((om, i) => moms[i] * om);
        setLs(newLs);
        setL2(newLs.reduce((L2, L) => L2 + L * L, 0));
        setLabLs(mult1(invRot(ths), newLs));
        setK(newLs.reduce((K, L, i) => K + L * oms[i], 0)/2);
        return Fs;
    }

    const nextFs = (intFs, m) => Fs(ths.map((th, i) => th + intFs[i] * dt / 1000 / m));

    // With each "tick", calculate the next set of 3 Euler angles
    useEffect(() => {
        if (!running) return;
        let Fs1 = Fs(ths);
        let Fs2 = nextFs(Fs1, 2);
        let Fs3 = nextFs(Fs2, 2);
        let Fs4 = nextFs(Fs3, 1);
        setThs([...ths].map((th, i) => th + (Fs1[i] + Fs4[i] + 2 * (Fs2[i] + Fs3[i])) * dt/ 1000 / 6));
    }, [time, running]);
    return (
        <>
            <div className="top"><p align="center"><h1>Free-body rotation</h1></p></div>
            <div className="bottom">
            <div className="left">
            <button onClick={() => setRunning(!running)}>{running ? "Stop" : "Start"}</button>
            <button onClick={() => setTime(0)}>Reset</button>
            Time = {time.toFixed(2)} s
            <div><Input quantity={running || time ? Lz : LzInput}
                handler={handlerLz}
            /> z-component of angular momentum
            </div>
            <div>{shape ? "Shape of body": null}</div>
            <select value={shape} onChange={e => {
                let newShape = Number(e.target.value);
                setShape(newShape);
                if (newShape === 1) setDegeneracies([true, true, true]);
                if (newShape) setTypes([[''], ['parallel axis', 'transverse axis'], ['short axis', 'intermediate axis', 'long axis']][newShape - 1]);
            }}>
                  {["choose body's shape", 'isotropic (cube)', 'axisymmetric (e.g., box for pizza or wine)', 'asymmetric (e.g., suitcase)'].map((option, i) => <option key={i} value={i}>{option} </option>)}
            </select>
            {!shape ? null :
                <>
                <div>Moment{`${shape === 1 ? '' : "s"}`} of inertia:</div>
                {xyz.filter((blah, i) => i < shape).map((blah, i) => {
                    return <div><Input key={i} name={i} quantity={momsInput[i]} handler={handlerMom} />{types[i]}</div>
                })}
                <div>{legalOrder ? null : "WARNING: for an asymmetric rotor the moments of inertia should decrease, going from short axis to long axis."}</div>
                <div>{!areLegalMoms ? "WARNING: no single moment of inertia should exceed the sum of the other two." : null}</div>
                {shape < 2 ? null :
                    <>
                    <div>Choose <i>z</i>-axis to be ...</div>
                    <select value={zAxis} onChange={e => {
                        let newZAxis = Number(e.target.value);
                        let newMoms = [...moms];
                        newMoms[2] = firstMoms[newZAxis - 1];
                        newMoms[0] = firstMoms[newZAxis % 3];
                        newMoms[1] = firstMoms[(newZAxis + 1) % 3];
                        setMoms(newMoms);
                        setZAxis(newZAxis);
                        // set as "true" for all axes for which moments of inertia are degenerate
                        let newDegeneracies = newMoms.map((momI, i) => {
                            return newMoms.reduce((degenerate, momJ, j) => {
                                return degenerate || (momJ === momI && i !== j);
                            }, false);
                        })
                        setDegeneracies(newDegeneracies);
                    }}>
                      {["which axis?", ...types].map((option, i) => <option key={i} value={i}>near {option} </option>)}
                    </select>
                    <div>{!zAxis ? null : "Euler angles"}</div>
                    </>
                }
                </>
            }
            <table>
                <thead>
                    <tr>
                        <th>Quantity</th>
                        <th>x-comp</th>
                        <th>y-comp</th>
                        <th>z-comp</th>
                        <th>magnit.</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>angles (rad)</td>
                        <td><Input key={"ang0"} name={0} quantity={running || time ? ths[0] : thsInput[0]} handler={handlerTh} /></td>
                        <td><Input key={"ang1"} name={1} quantity={running || time ? ths[1] : thsInput[1]} handler={handlerTh} /></td>
                        <td><Input key={"ang2"} name={2} quantity={running || time ? ths[2] : thsInput[2]} handler={handlerTh} /></td>
                        <td> - </td>
                    </tr>
                    <tr>
                        <td>moments</td>
                        <td><Input key={"mom0"} name={0} quantity={moms[0]} handler={handlerMom} /></td>
                        <td><Input key={"mom1"} name={1} quantity={moms[1]} handler={handlerMom} /></td>
                        <td><Input key={"mom2"} name={2} quantity={moms[2]} handler={handlerMom} /></td>
                        <td>{areLegalMoms ? null : "WARNING: No single moment of inertia should exceed the sum of the other two."}</td>
                    </tr>
                    <tr>
                        <td>(body) omega</td>
                        <td>{Math.round(oms[0] * 1000) / 1000}</td>
                        <td>{Math.round(oms[1] * 1000) / 1000}</td>
                        <td>{Math.round(oms[2] * 1000) / 1000}</td>
                        <td>{Math.round(Math.sqrt(om2) * 1000) / 1000}</td>
                    </tr>
                    <tr>
                        <td>(fixed) omega</td>
                        <td>{Math.round(omfs[0] * 1000) / 1000}</td>
                        <td>{Math.round(omfs[1] * 1000) / 1000}</td>
                        <td>{Math.round(omfs[2] * 1000) / 1000}</td>
                        <td>{Math.round(omf * 1000) / 1000}</td>
                    </tr>
                    <tr>
                        <td>ang. mom</td>
                        <td>{Math.round(labLs[0] * 1000) / 1000}</td>
                        <td>{Math.round(labLs[1] * 1000) / 1000}</td>
                        <td>{Math.round(labLs[2] * 1000) / 1000}</td>
                        <td>{Math.round(1000 * Math.sqrt(L2) / 1000)}</td>
                    </tr>
                    <tr>
                        <td>KE</td><td></td><td></td><td></td><td>{Math.round(1000 * K) / 1000}</td>
                    </tr>
                </tbody>
            </table>
            </div>
            <div className="container" style={{height:`${ny}px`, width:`${nx}px`}}>
                {mids.map((mid, i) => (
                    degeneracies[Math.floor(i / 2)] ? null :
                        <Line xi={nx/2} yi={ny/2} xf={nx * (0.5 + mid[0]/d[Math.floor(i / 2)]/10)} yf={ny * (0.5 + mid[1]/d[Math.floor(i / 2)]/10)} dashed={true} />
                ))}
                <Line xi={nx/2} yi={ny/2} xf={nx * (1 + omfs[0]/omf) / 4} yf={ny * (1 + omfs[1]/omf) / 4} />
                <Body nx={nx} ny={ny} angleVec={angleVec} d={d} />
            </div>
            </div>
        </>
    )
}
export default App;
