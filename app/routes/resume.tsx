import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => [
    { title: "Resumind | Review" },
    { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const navigate = useNavigate();

    const [imageUrl, setImageUrl] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=/resume/${id}`);
        }
    }, [isLoading]);

    useEffect(() => {
        const loadResume = async () => {
            const stored = await kv.get(`resume:${id}`);
            if (!stored) return;

            const data = JSON.parse(stored);

            // Resume PDF
            const pdfBlob = await fs.read(data.resumePath);
            if (pdfBlob) {
                setResumeUrl(URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" })));
            }

            // Resume Image
            const imgBlob = await fs.read(data.imagePath);
            if (imgBlob) {
                setImageUrl(URL.createObjectURL(imgBlob));
            }

            /** 🔥 AI → UI TRANSFORMATION (MAIN FIX) */
            const ai = data.feedback;

            const normalizedFeedback: Feedback = {
                overallScore: (ai.overall_rating ?? 0) * 10,

                ATS: {
                    score: (ai.ats_compatibility ?? 0) * 10,
                    tips: (ai.missing_keywords ?? []).map((k: string) => ({
                        type: "improve",
                        tip: `Add keyword: ${k}`,
                    })),
                },

                toneAndStyle: {
                    score: (ai.format_and_design ?? 0) * 10,
                    tips: (ai.improvement_suggestions ?? []).slice(0, 3).map((t: string) => ({
                        type: "improve",
                        tip: t,
                    })),
                },

                content: {
                    score: (ai.content_quality ?? 0) * 10,
                    tips: Object.values(ai.detailed_feedback ?? {})
                        .slice(0, 3)
                        .map((t: any) => ({
                            type: "improve",
                            tip: t,
                        })),
                },

                structure: {
                    score: (ai.relevance_to_job ?? 0) * 10,
                    tips: [
                        {
                            type: "improve",
                            tip: ai.final_recommendation ?? "Improve resume structure",
                        },
                    ],
                },

                skills: {
                    score: ai.keyword_match_percentage ?? 0,
                    tips: (ai.missing_keywords ?? []).map((k: string) => ({
                        type: "improve",
                        tip: `Learn or add experience with ${k}`,
                    })),
                },
            };

            setFeedback(normalizedFeedback);
        };

        loadResume();
    }, [id]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
                    <span className="text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>

            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section sticky top-0 h-[100vh]">
                    {imageUrl && resumeUrl && (
                        <a href={resumeUrl} target="_blank">
                            <img src={imageUrl} className="rounded-2xl" />
                        </a>
                    )}
                </section>

                <section className="feedback-section">
                    <h2 className="text-4xl font-bold">Resume Review</h2>

                    {feedback ? (
                        <div className="flex flex-col gap-8">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score} suggestions={feedback.ATS.tips} />
                            <Details feedback={feedback} />
                        </div>
                    ) : (
                        <img src="/images/resume-scan-2.gif" />
                    )}
                </section>
            </div>
        </main>
    );
};

export default Resume;
