
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User, IncidentReport } from '../types';
import { formatDisplayDate } from '../utils/time';

// --- Sub-components for better organization ---

// Status Badge Component
const StatusBadge: React.FC<{ status: IncidentReport['status'] }> = ({ status }) => {
    const statusStyles = {
        submitted: 'bg-yellow-100 text-yellow-800',
        in_progress: 'bg-blue-100 text-blue-800',
        resolved: 'bg-green-100 text-green-800',
    };
    const statusText = {
        submitted: 'Submitted',
        in_progress: 'In Progress',
        resolved: 'Resolved',
    };
    return (
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusStyles[status]}`}>
            {statusText[status]}
        </span>
    );
};

// Incident Report Card Component
const ReportCard: React.FC<{ report: IncidentReport }> = ({ report }) => (
    <div className="bg-white p-4 rounded-xl border border-border-color shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300">
        <div className="flex justify-between items-start">
            <h3 className="font-bold text-text-primary pr-2 break-words">{report.subject}</h3>
            <StatusBadge status={report.status} />
        </div>
        <p className="text-sm text-text-secondary mt-1">
            Incident Date: {formatDisplayDate(report.incident_date)}
        </p>
        <p className="text-sm text-text-primary mt-3 whitespace-pre-wrap break-words">
            {report.body}
        </p>
        {report.image_url && (
            <div className="mt-4">
                <a href={report.image_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                    View Attached Image
                </a>
            </div>
        )}
    </div>
);

// New Multi-Step Workflow Component
const IncidentReportWorkflow: React.FC<{
    user: User;
    onCancel: () => void;
    onSubmitSuccess: () => void;
}> = ({ user, onCancel, onSubmitSuccess }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        incident_date: '',
        subject: '',
        body: '',
        work_hours: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const steps = ['Details', 'Explanation', 'Evidence', 'Review'];

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB
                setError('File size must be under 5MB.');
                return;
            }
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                setError('Only JPG and PNG files are allowed.');
                return;
            }
            setError(null);
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const isStepValid = () => {
        switch(step) {
            case 1: return formData.incident_date.trim() !== '' && formData.subject.trim() !== '';
            case 2: return formData.body.trim() !== '';
            default: return true;
        }
    };
    
    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let imageUrl: string | null = null;
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${user.userid}-${Date.now()}.${fileExt}`;
                const filePath = `${user.userid}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('incident-images')
                    .upload(filePath, imageFile);

                if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                
                const { data } = supabase.storage.from('incident-images').getPublicUrl(filePath);
                imageUrl = data.publicUrl;
            }

            const { error: insertError } = await (supabase as any).from('incident_reports').insert({
                user_id: user.userid,
                user_name: user.name,
                subject: formData.subject.trim(),
                body: formData.body.trim(),
                incident_date: formData.incident_date,
                work_hours: formData.work_hours ? parseInt(formData.work_hours, 10) : null,
                image_url: imageUrl,
                status: 'submitted',
            } as any);

            if (insertError) throw insertError;
            onSubmitSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to submit report.');
        } finally {
            setIsLoading(false);
        }
    };

    const ProgressBar = () => (
        <div className="mb-10 w-full">
            <div className="flex items-center">
                {steps.map((s, index) => {
                    const isCompleted = step > index + 1;
                    const isActive = step === index + 1;
                    const isLastStep = index === steps.length - 1;

                    return (
                        <React.Fragment key={s}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`
                                        flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold transition-all duration-300
                                        ${isCompleted ? 'bg-primary text-white' : ''}
                                        ${isActive ? 'bg-primary text-white ring-4 ring-primary/30' : ''}
                                        ${!isCompleted && !isActive ? 'bg-gray-200 text-text-secondary' : ''}
                                    `}
                                >
                                    {isCompleted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </div>
                                <p className={`mt-2 text-xs w-20 text-center font-semibold ${isActive || isCompleted ? 'text-primary' : 'text-text-secondary'}`}>
                                    {s}
                                </p>
                            </div>
                            {!isLastStep && (
                                <div className={`flex-1 h-1 rounded transition-all duration-300 ${step > index + 1 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in-scale p-4 sm:p-8 border border-border-color rounded-xl bg-white shadow-lg">
            <h3 className="text-lg font-bold text-text-primary mb-2 text-center">File Incident Report</h3>
            <p className="text-sm text-text-secondary mb-6 text-center">Follow the steps below to complete your report.</p>

            <ProgressBar />
            
            <div className="space-y-6">
                {step === 1 && (
                    <div className="space-y-4 animate-fade-in-scale">
                         <div>
                            <label htmlFor="incident_date" className="block text-sm font-medium text-text-secondary mb-1">Date of Incident</label>
                            <input type="date" name="incident_date" id="incident_date" value={formData.incident_date} onChange={handleInputChange} required className="input-field" />
                        </div>
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-text-secondary mb-1">Subject</label>
                            <input type="text" name="subject" id="subject" value={formData.subject} onChange={handleInputChange} required maxLength={100} className="input-field" />
                        </div>
                    </div>
                )}
                {step === 2 && (
                     <div className="space-y-4 animate-fade-in-scale">
                        <div>
                            <label htmlFor="body" className="block text-sm font-medium text-text-secondary mb-1">Details of Incident</label>
                            <textarea name="body" id="body" value={formData.body} onChange={handleInputChange} required rows={5} maxLength={1000} className="input-field" />
                        </div>
                        <div>
                            <label htmlFor="work_hours" className="block text-sm font-medium text-text-secondary mb-1">Approximate Hours Worked (Optional)</label>
                            <input type="number" name="work_hours" id="work_hours" value={formData.work_hours} onChange={handleInputChange} min="0" step="0.5" className="input-field" />
                        </div>
                    </div>
                )}
                {step === 3 && (
                     <div className="animate-fade-in-scale">
                        <label htmlFor="image" className="block text-sm font-medium text-text-secondary mb-1">Attach an Image (Optional)</label>
                        <input type="file" id="image" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-icon-bg file:text-primary hover:file:bg-primary/20" />
                        {imagePreview && <img src={imagePreview} alt="Preview" className="mt-4 max-h-40 rounded-lg border border-border-color" />}
                    </div>
                )}
                 {step === 4 && (
                     <div className="space-y-4 animate-fade-in-scale bg-gray-50 p-4 rounded-md border border-border-color">
                        <h4 className="font-bold text-text-primary">Review Your Report</h4>
                        <div className="text-sm space-y-2">
                           <p><strong className="text-text-secondary">Date:</strong> {formatDisplayDate(formData.incident_date)}</p>
                           <p><strong className="text-text-secondary">Subject:</strong> {formData.subject}</p>
                           <p><strong className="text-text-secondary">Details:</strong> <span className="whitespace-pre-wrap">{formData.body}</span></p>
                           <p><strong className="text-text-secondary">Hours Worked:</strong> {formData.work_hours || 'N/A'}</p>
                           {imagePreview && <div><strong className="text-text-secondary">Evidence:</strong><img src={imagePreview} alt="Evidence" className="mt-2 max-h-40 rounded-lg"/></div>}
                        </div>
                    </div>
                )}

                {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                <div className="mt-8 flex justify-between items-center">
                    <div>
                        {step > 1 && (
                            <button onClick={handleBack} disabled={isLoading} className="secondary-button">Back</button>
                        )}
                        {step === 1 && (
                             <button onClick={onCancel} disabled={isLoading} className="secondary-button">Cancel</button>
                        )}
                    </div>
                    <div>
                        {step < steps.length && (
                            <button onClick={handleNext} disabled={!isStepValid()} className="primary-button">Next</button>
                        )}
                        {step === steps.length && (
                            <button onClick={handleSubmit} disabled={isLoading} className="primary-button">
                                {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Submit Report'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .input-field {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background-color: #F3EFE0;
                    border: 1px solid #E5E7EB;
                    border-radius: 0.375rem;
                    color: #1F2937;
                    transition: all 0.2s;
                }
                .input-field:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px #046241;
                    border-color: transparent;
                }
                .primary-button {
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    padding: 0.75rem 1.5rem;
                    border: 1px solid transparent;
                    border-radius: 0.375rem;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: white;
                    background-color: #046241;
                    transition: background-color 0.2s;
                }
                .primary-button:hover { background-color: #057A55; }
                .primary-button:disabled { opacity: 0.5; cursor: not-allowed; }
                .secondary-button {
                    display: inline-flex;
                    justify-content: center;
                    padding: 0.75rem 1.5rem;
                    border: 1px solid #E5E7EB;
                    border-radius: 0.375rem;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: #6B7281;
                    background-color: white;
                    transition: background-color 0.2s;
                }
                .secondary-button:hover { background-color: #F9FAFB; }
                .secondary-button:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};


// Main Component
interface IncidentReportsProps {
    user: User;
    initialReports: IncidentReport[];
    onUpdate: () => void;
}

const IncidentReports: React.FC<IncidentReportsProps> = ({ user, initialReports, onUpdate }) => {
    const [view, setView] = useState<'list' | 'form'>('list');

    const handleFormSubmitSuccess = () => {
        onUpdate(); // Re-fetch all data, including new report
        setView('list'); // Switch back to list view
    };

    return (
        <div>
            {view === 'list' ? (
                <div className="animate-fade-in-scale">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setView('form')}
                            className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-md shadow-sm transition transform hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span>File New Report</span>
                        </button>
                    </div>
                    {initialReports.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto no-scrollbar pb-4">
                            {initialReports.map(report => <ReportCard key={report.id} report={report} />)}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-border-color rounded-lg">
                             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-4 text-text-secondary">You have not filed any incident reports.</p>
                        </div>
                    )}
                </div>
            ) : (
                <IncidentReportWorkflow user={user} onCancel={() => setView('list')} onSubmitSuccess={handleFormSubmitSuccess} />
            )}
        </div>
    );
};

export default IncidentReports;
