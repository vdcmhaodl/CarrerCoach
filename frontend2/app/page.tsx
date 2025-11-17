"use client";

import { useState, useEffect } from "react";

export default function InterviewStart() {
  const fields: string[] = [
    "Data Science",
    "Machine Learning",
    "Computer Systems",
    "Computer Science",
  ];

  const [currentField, setCurrentField] = useState(fields[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentField((prev) => {
        const currentIndex = fields.indexOf(prev);
        const nextIndex = (currentIndex + 1) % fields.length;
        return fields[nextIndex];
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fields]);

  return (
    <div className="flex flex-col">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start" />

        <div className="navbar-center">
          <a className="text-xl text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
            coach warmup
          </a>
        </div>

        <div className="navbar-end">
          <ul className="menu menu-horizontal px-1">
            <li>
              <a>Link</a>
            </li>
            <li>
              <details>
                <summary>Parent</summary>
                <ul className="bg-base-100 rounded-t-none p-2">
                  <li>
                    <a>Link 1</a>
                  </li>
                  <li>
                    <a>Link 2</a>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col grid-rows-5 gap-2.5 h-screen place-items-center">
        <h1 className="text-6xl font-semibold w-full text-center mt-40">
          interview{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
            warmup
          </span>
        </h1>
        <h2 className="text-base w-full text-center text-gray-500 mt-8">
          A quick way to prepare for your next interview in
        </h2>
        <div className="badge badge-soft badge-info font-semibold text-lg">
          {currentField}
        </div>
        <h2 className="text-base w-full text-center mt-8 max-w-[36rem]">
          Practice key questions, get insights about answers, and get more
          comfortable interviewing.
        </h2>
        <a href="/start" className="mt-5">
          <button className="btn btn-info rounded-xl">Start practicing</button>
        </a>
      </div>
    </div>
  );
}
