'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import React, { useState, useRef } from 'react';

export default function ReportUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('report', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/v1/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = `Server returned ${res.status}`;
        try {
          const errData = await res.json();
          errorMessage = errData.detail || errData.error || errorMessage;
        } catch (e) {
          // fallback to status code if json fails
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze document.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-slate-800">Analyze New Medical Report</h2>
      
      {!result ? (
        <>
          <div 
            className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf,.png,.jpg,.jpeg"
            />
            
            {!file ? (
              <div className="space-y-2">
                <div className="text-4xl">📄</div>
                <p className="font-medium text-slate-700">Click to upload or drag and drop</p>
                <p className="text-sm text-slate-500">Supported formats: PDF, PNG, JPG</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl">✅</div>
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="mt-2 text-rose-500 hover:underline text-sm font-medium"
                >
                  Remove file
                </button>
              </div>
            )}
          </div>

          {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100">{error}</div>}

          <button 
            onClick={handleSubmit} 
            disabled={!file || loading}
            className={`w-full py-3 rounded-xl font-semibold transition-all shadow-sm
              ${(!file || loading) 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'}`}
          >
            {loading ? 'Analyzing via AI (this may take a moment)...' : 'Simplify Medical Report ✨'}
          </button>
        </>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
              <span>✨</span> AI Simplified Results
            </h3>
            <button 
              onClick={() => {setResult(null); clearFile();}}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Analyze Another
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 text-slate-800 prose prose-indigo prose-sm max-w-none">
            {/* Split markdown style response by newlines roughly. In a real app we'd use react-markdown */}
            {result.simplified_report.split('\n').map((line: string, i: number) => {
              if (line.startsWith('###')) return <h3 key={i} className="text-indigo-900 font-bold mt-4 mb-2">{line.replace('###', '')}</h3>;
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold">{line.replace(/\*\*/g, '')}</p>;
              // bold replacements within line
              let formattedLine = line;
              const bolds = formattedLine.match(/\*\*(.*?)\*\*/g);
              if (bolds) {
                 return (
                   <p key={i} dangerouslySetInnerHTML={{__html: formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}} />
                 );
              }
              if (line.trim() === '') return <br key={i} />;
              return <p key={i}>{line}</p>;
            })}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex gap-4">
             <span>Terms Extracted: {result.terms_extracted}</span>
             <span>Text Length: {result.raw_text_length} chars</span>
          </div>
        </div>
      )}
    </div>
  );
}
